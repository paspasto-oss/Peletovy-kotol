/* global React, ReactDOM, html2pdf */
const { useState, useMemo } = React;

/* ===================== Pomôcky ===================== */
const pad2 = (n)=>String(n).padStart(2,'0');
const todayStr = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };

// --- Číslovanie: ručne editovateľné ---
const getSeq = (y)=> parseInt(localStorage.getItem(`revizie.seq.${y}`)||'0', 10);
const setSeq = (y,n)=> localStorage.setItem(`revizie.seq.${y}`, String(n));
function suggestReportNo(){
  const y = new Date().getFullYear();
  const next = getSeq(y) + 1;
  return `RS-${y}-${String(next).padStart(4,'0')}`;
}
function parseReportNo(no){
  const m = /^RS-(\d{4})-(\d{4})$/.exec((no||'').trim());
  if(!m) return null; return { year: +m[1], seq: +m[2] };
}
function ensureNumberAndBumpCounter(cislo){
  const p = parseReportNo(cislo);
  if(!p){ alert('Číslo musí byť vo formáte RS-YYYY-#### (napr. RS-2025-0007).'); return false; }
  if(p.seq<1 || p.seq>9999){ alert('Poradové číslo musí byť v rozsahu 0001–9999.'); return false; }
  const cur = getSeq(p.year);
  if(p.seq>cur) setSeq(p.year,p.seq); // posuň dopredu len ak je vyššie
  return true;
}

// Bezpečný klon
const clone = (o)=>JSON.parse(JSON.stringify(o));

/* ===================== Šablóny ===================== */
const TEMPLATES = (()=>{
  const BOILER = {
    label:"Plynový kotol", deviceTitle:"Plynový kotol", snLabel:"Výrobné číslo",
    metrics:[["spaliny","Spaliny"],["tlakZaReg","Tlak plynu za regulátorom"],["voda","Tlak systému / expanzná"],["komin","Komín / ťah"]],
    checklist:[
      ["vizual","Vizuálna prehliadka"],["vyrobneCislo","Výrobné číslo kotla"],["typKotla","Typ kotla / výkon"],["spaliny","Hodnoty spalín"],["tlakZaReg","Tlak plynu za regulátorom"],["tesnost","Skúška tesnosti plynu"],["poistnyVentil","Poistný ventil"],["bezpPrvky","Bezpečnostné prvky"],["horak","Horák"],["filter","Filtre plynu/vody"],["komin","Dymovod/komín"],["spojky","Armatúry a spoje"],["elektro","Elektrické pripojenie"],["voda","Tlak inšt./expanzka"],["regulator","Regulátor tlaku – SN"],["zaznam","Záznam a poučenie"]
    ],
    defaults:{
      vizual:{ok:1,val:"Bez korózie, tesné"}, vyrobneCislo:{ok:1,val:"PTC24-2309-0011876"}, typKotla:{ok:1,val:"Protherm Tiger Condens 24/28 KKO • 24 kW"},
      spaliny:{ok:1,val:"CO 8 ppm • CO₂ 9.2 % • O₂ 5.1 % • ťah 12 Pa • T 65 °C"}, tlakZaReg:{ok:1,val:"18 mbar"}, tesnost:{ok:1,val:"OK – úbytok 0 mbar / 5 min"},
      poistnyVentil:{ok:1,val:"Funkčný"}, bezpPrvky:{ok:1,val:"STB a presostat OK"}, horak:{ok:1,val:"Vyčistený"}, filter:{ok:1,val:"Vyčistené"},
      komin:{ok:1,val:"Ťah stabilný"}, spojky:{ok:1,val:"Bez únikov"}, elektro:{ok:1,val:"Uzemnenie OK"}, voda:{ok:1,val:"1.3 bar / 0.9 bar"},
      regulator:{ok:1,val:"RS-2309-11876"}, zaznam:{ok:1,val:"Bez závad, kontrola o 12 mes."}
    }
  };

  const HP = {
    label:"Tepelné čerpadlo", deviceTitle:"Tepelné čerpadlo", snLabel:"Sériové číslo (S/N)",
    metrics:[["vody","Voda – VT/RV/ΔT"],["chladivo","Chladiaci okruh – LP/HP"],["elektro","Elektrika"],["unikChladiva","Tesnosť chladiva"]],
    checklist:[
      ["vizual","Vizuálna prehliadka"],["vyrobneCislo","Sériové číslo (S/N)"],["typKotla","Typ TČ / výkon"],["chladivo","Chladiaci okruh"],["vody","Voda – prietok/ΔT"],["elektro","Elektrika"],["unikChladiva","Tesnosť chladiva"],["kondenzat","Kondenzát"],["cerpadla","Čerpadlá"],["filtre","Filtre"],["poistnyVentil","Poistný ventil"],["expanzka","Expanzka"],["regulator","Regulácia"],["senzory","Senzory"],["odmrazovanie","Odmrazovanie"],["zaznam","Záznam a poučenie"]
    ],
    defaults:{
      vizual:{ok:1,val:"Bez poškodení"}, vyrobneCislo:{ok:1,val:"HP-24-2023-001122"}, typKotla:{ok:1,val:"Vzduch-voda • 8 kW"},
      chladivo:{ok:1,val:"LP 4.5 bar • HP 18.2 bar"}, vody:{ok:1,val:"1.2 m³/h • ΔT 5 K"}, elektro:{ok:1,val:"Uzemnenie OK"},
      unikChladiva:{ok:1,val:"Negatívne"}, kondenzat:{ok:1,val:"Spád OK"}, cerpadla:{ok:1,val:"Funkčné"}, filtre:{ok:1,val:"Vyčistené"},
      poistnyVentil:{ok:1,val:"OK"}, expanzka:{ok:1,val:"0.9 bar"}, regulator:{ok:1,val:"FW 1.14"}, senzory:{ok:1,val:"V norme"}, odmrazovanie:{ok:1,val:"OK"},
      zaznam:{ok:1,val:"Bez závad, kontrola o 12 mes."}
    }
  };

  const PELLET = {
    label:"Kotol na pelety", deviceTitle:"Kotol na pelety", snLabel:"Výrobné číslo",
    metrics:[["spaliny","Spaliny (pellet)"],["tah","Ťah komína"],["voda","Tlak systému / expanzka"],["zasobnik","Palivo / zásobník"]],
    checklist:[
      ["vizual","Vizuálna prehliadka"],["vyrobneCislo","Výrobné číslo"],["typKotla","Typ kotla / výkon"],["spaliny","Spaliny"],["tah","Ťah komína"],["tesnost","Tesnosť dymovodu"],["vymennik","Čistota výmenníka"],["komora","Spaľovacia komora"],["zasobnik","Zásobník peliet"],["zapalovanie","Zapaľovanie"],["senzory","Snímače"],["bezpPrvky","Bezpečnostné prvky"],["hydraulika","Hydraulika"],["voda","Tlak systému / expanzka"],["elektro","Elektrika"],["zaznam","Záznam a poučenie"]
    ],
    defaults:{
      vizual:{ok:1,val:"Čisté, bez korózie"}, vyrobneCislo:{ok:1,val:"PEL-2024-001234"}, typKotla:{ok:1,val:"PelletCondens 15 • 15 kW"},
      spaliny:{ok:1,val:"CO 50 ppm • O₂ 7.5 % • CO₂ 11.5 % • λ 1.8 • T 140 °C"}, tah:{ok:1,val:"12 Pa"}, tesnost:{ok:1,val:"Tesné"},
      vymennik:{ok:1,val:"Sadze ≤ 1 mm"}, komora:{ok:1,val:"Rošt bez nánosov"}, zasobnik:{ok:1,val:"Suchý, šnek OK"}, zapalovanie:{ok:1,val:"Nábeh do 3 min"},
      senzory:{ok:1,val:"Lambda OK"}, bezpPrvky:{ok:1,val:"STB/klapka OK"}, hydraulika:{ok:1,val:"Návrat ≥55 °C"}, voda:{ok:1,val:"1.5 bar / 0.9 bar"},
      elektro:{ok:1,val:"PE/Polarita OK"}, zaznam:{ok:1,val:"Bez závad, kontrola o 12 mes."}
    }
  };
  return { boiler: BOILER, hp: HP, pellet: PELLET };
})();

/* ===================== Default report ===================== */
const DEFAULT_REPORT = (type="boiler") => ({
  type,
  cislo: suggestReportNo(), // len návrh – editovateľné
  datum: todayStr(),
  zakaznik:{ nazov:"Bytový dom Hurbanova 12", adresa:"Hurbanova 12, 015 01 Rajec", ico:"36789012", dic:"2023456789", email:"spravca@bd-hurbanova.sk" },
  checklist:{ ...TEMPLATES[type].defaults },
  logoUrl:"./assets/logo-spektrainstall.png",
  podpisTechnikaStampUrl:"./assets/podpis-technika.png",
  podpisZakaznika:"",
  podpisTechnika:""
});

/* ===================== Archív (LocalStorage) ===================== */
const ARCH_KEY = 'revizie.archive.v1';
const loadArchive = ()=>{ try{ return JSON.parse(localStorage.getItem(ARCH_KEY)||'[]'); }catch{ return []; } };
const saveArchive = (list)=> localStorage.setItem(ARCH_KEY, JSON.stringify(list));
function addToArchive(report){
  const list = loadArchive();
  const entry = { id: crypto.randomUUID(), cislo: report.cislo, datum: report.datum, typ: report.type, zakaznik: report.zakaznik?.nazov||'', createdAt: new Date().toISOString(), data: clone(report) };
  list.unshift(entry); saveArchive(list); return entry.id;
}
function deleteFromArchive(id){ saveArchive(loadArchive().filter(e=>e.id!==id)); }

/* ===================== PDF drobnosti ===================== */$1

/* ===================== Podpisové plátno ===================== */
function SignaturePad({ title = 'Podpis', onSave, onCancel }){
  const ref = React.useRef(null);
  const ctxRef = React.useRef(null);
  const drawing = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const cvs = ref.current;
    const dpr = window.devicePixelRatio || 1;
    const r = cvs.getBoundingClientRect();
    cvs.width = r.width * dpr; cvs.height = r.height * dpr;
    const ctx = cvs.getContext('2d');
    ctx.scale(dpr, dpr); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    ctxRef.current = ctx;

    const get = (e) => { const t = e.touches ? e.touches[0] : e; const cr = cvs.getBoundingClientRect(); return { x: t.clientX - cr.left, y: t.clientY - cr.top }; };
    const start = (e) => { e.preventDefault(); drawing.current = true; last.current = get(e); };
    const move = (e) => { if (!drawing.current) return; e.preventDefault(); const p = get(e), ctx = ctxRef.current; ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last.current = p; };
    const end = (e) => { e.preventDefault(); drawing.current = false; };
    const opt = { passive: false };
    cvs.addEventListener('mousedown', start, opt); cvs.addEventListener('mousemove', move, opt); window.addEventListener('mouseup', end, opt);
    cvs.addEventListener('touchstart', start, opt); cvs.addEventListener('touchmove', move, opt); cvs.addEventListener('touchend', end, opt);
    return () => {
      cvs.removeEventListener('mousedown', start, opt); cvs.removeEventListener('mousemove', move, opt); window.removeEventListener('mouseup', end, opt);
      cvs.removeEventListener('touchstart', start, opt); cvs.removeEventListener('touchmove', move, opt); cvs.removeEventListener('touchend', end, opt);
    };
  }, []);

  const clear = () => { const cvs = ref.current; const ctx = ctxRef.current; ctx.clearRect(0, 0, cvs.width, cvs.height); };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/60 grid place-items-center z-50', onClick: onCancel },
    React.createElement('div', { className: 'bg-white rounded-2xl w-[90vw] max-w-lg p-4', onClick: e => e.stopPropagation() },
      React.createElement('div', { className: 'text-lg font-semibold mb-2' }, title),
      React.createElement('canvas', { ref: ref, className: 'w-full h-40 rounded border' }),
      React.createElement('div', { className: 'mt-3 flex justify-between' },
        React.createElement('button', { className: 'btn bg-gray-200', onClick: clear }, 'Vymazať'),
        React.createElement('div', null,
          React.createElement('button', { className: 'btn bg-gray-200 mr-2', onClick: onCancel }, 'Zrušiť'),
          React.createElement('button', { className: 'btn bg-emerald-600 text-white', onClick: () => onSave(ref.current.toDataURL('image/png')) }, 'Uložiť podpis')
        )
      )
    )
  );
}

/* ===================== App ===================== */
function App(){$1const [showSigZ, setShowSigZ] = useState(false);
  const [showSigT, setShowSigT] = useState(false);

  const archive = useMemo(()=> loadArchive(), [report.cislo]);

  const setChecklistVal = (k,p)=> setReport(r=>({...r, checklist:{...r.checklist, [k]:{...(r.checklist[k]||{}), ...p}}}));
  const Input = (props)=>React.createElement('input',{...props,className:`input w-full ${props.className||''}`});

  // --- Share PDF (1× A4, Share Sheet + fallback) ---
  const sharePDF = async () => {
    if(!ensureNumberAndBumpCounter(report.cislo)) return; // validácia čísla

    const wrapper = document.getElementById('pdf-wrapper');
    const sheet   = document.getElementById('pdf-sheet');
    sheet.classList.add('pdf-compact');
    const A4W=794, A4H=1123;
    const prev={transform:wrapper.style.transform,transformOrigin:wrapper.style.transformOrigin,width:wrapper.style.width,height:wrapper.style.height};
    const realW=Math.ceil(wrapper.scrollWidth), realH=Math.ceil(wrapper.scrollHeight);
    if(realW>A4W || realH>A4H){ const s=Math.min(A4W/realW, A4H/realH); wrapper.style.transformOrigin='top left'; wrapper.style.transform=`scale(${s})`; wrapper.style.width=`${A4W}px`; wrapper.style.height=`${A4H}px`; }
    try{
      const worker = html2pdf().set({ margin:0, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true,allowTaint:true,scrollY:0,backgroundColor:'#fff',width:A4W,height:A4H,windowWidth:A4W,windowHeight:A4H,letterRendering:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}, pagebreak:{mode:[]} }).from(wrapper);
      const pdf = await worker.toPdf().get('pdf');
      const blob = new Blob([pdf.output('arraybuffer')],{type:'application/pdf'});
      const filename = `Revízna_sprava-${report.cislo}.pdf`;
      if(navigator.canShare){ const file = new File([blob], filename, { type:'application/pdf' }); if(navigator.canShare({files:[file]})){ try{ await navigator.share({ files:[file], title:'Revízna správa', text:'PDF (1× A4)' }); sheet.classList.remove('pdf-compact'); return; }catch(_){} } }
      const url = URL.createObjectURL(blob); const w = window.open(url,'_blank'); if(!w){ const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); } setTimeout(()=>URL.revokeObjectURL(url),1500);
    } finally { sheet.classList.remove('pdf-compact'); wrapper.style.transform=prev.transform; wrapper.style.transformOrigin=prev.transformOrigin; wrapper.style.width=prev.width; wrapper.style.height=prev.height; }
  };

  // --- Archív akcie ---
  const saveCurrentToArchive = ()=>{ if(!ensureNumberAndBumpCounter(report.cislo)) return; addToArchive(report); alert(`Uložené do archívu: ${report.cislo}`); };
  const loadFromArchive = (entry)=> setReport(clone(entry.data));
  const deleteEntry = (id)=>{ if(confirm('Zmazať z archívu?')){ deleteFromArchive(id); setReport(r=>({...r})); } };
  const newReport = ()=> setReport(DEFAULT_REPORT(report.type));

  const tmpl = TEMPLATES[report.type];
  const filteredArchive = useMemo(()=>{
    const q = search.trim().toLowerCase(); const list = loadArchive(); if(!q) return list;
    return list.filter(e=> (e.cislo||'').toLowerCase().includes(q) || (e.zakaznik||'').toLowerCase().includes(q) || (e.typ||'').toLowerCase().includes(q));
  },[search, report.cislo]);

  return React.createElement('div',null,
    React.createElement('div',{className:'grid grid-cols-1 lg:grid-cols-3 gap-6'},

      /* ====== Editor ====== */
      React.createElement('section',{className:'p-4 space-y-4 rounded-xl border border-white/10 bg-white/5 lg:col-span-2'},
        React.createElement('div',{className:'flex items-center gap-3 justify-between flex-wrap'},
          React.createElement('div',{className:'flex items-center gap-3'},
            React.createElement('label',{className:'text-sm font-medium'},'Typ správy'),
            React.createElement('select',{className:'input !bg-gray-800 !text-white w-56', value:report.type, onChange:e=>{ const t=e.target.value; setReport(r=>({...DEFAULT_REPORT(t)})); }},[
              React.createElement('option',{value:'boiler',key:'b'},'Plynový kotol'),
              React.createElement('option',{value:'hp',key:'h'},'Tepelné čerpadlo'),
              React.createElement('option',{value:'pellet',key:'p'},'Kotol na pelety')
            ])
          ),
          React.createElement('div',{className:'flex items-center gap-2'},
            React.createElement('span',{className:'text-sm opacity-80'},'Číslo:'),
            React.createElement('input',{className:'input !bg-gray-800 !text-white w-48', value:report.cislo, onChange:e=>setReport(r=>({...r, cislo:e.target.value}))}),
            React.createElement('button',{className:'btn bg-gray-700', onClick:()=>setReport(r=>({...r, cislo: suggestReportNo()}))},'Navrhnúť')
          )
        ),

        React.createElement('h2',{className:'text-xl font-semibold'},'Údaje'),
        React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 gap-3'},
          React.createElement('label',null,'Názov',Input({value:report.zakaznik.nazov,onChange:e=>setReport(r=>({...r,zakaznik:{...r.zakaznik,nazov:e.target.value}}))})),
          React.createElement('label',null,'Adresa',Input({value:report.zakaznik.adresa,onChange:e=>setReport(r=>({...r,zakaznik:{...r.zakaznik,adresa:e.target.value}}))})),
          React.createElement('label',null,'IČO',Input({value:report.zakaznik.ico,onChange:e=>setReport(r=>({...r,zakaznik:{...r.zakaznik,ico:e.target.value}}))})),
          React.createElement('label',null,'DIČ',Input({value:report.zakaznik.dic,onChange:e=>setReport(r=>({...r,zakaznik:{...r.zakaznik,dic:e.target.value}}))})),
          React.createElement('label',{className:'md:col-span-2'},'E-mail',Input({type:'email',value:report.zakaznik.email,onChange:e=>setReport(r=>({...r,zakaznik:{...r.zakaznik,email:e.target.value}}))})),
          React.createElement('label',{className:'md:col-span-2'},'Dátum revízie', React.createElement('input',{type:'date',className:'input w-full',value:report.datum,onChange:e=>setReport(r=>({...r,datum:e.target.value}))}))
        ),

        React.createElement('h3',{className:'text-lg font-semibold'},'Merania – rýchle polia'),
        React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 gap-3'},
          ...tmpl.metrics.map(([k,lab]) => React.createElement('label',{key:k},lab,Input({value:report.checklist[k]?.val||"",onChange:e=>setChecklistVal(k,{val:e.target.value})})))
        ),

        React.createElement('h3',{className:'text-lg font-semibold'},`Kontrolný zoznam – ${tmpl.label}`),
        React.createElement('div',{className:'grid grid-cols-1 gap-3'},
          tmpl.checklist.map(([key,label])=>React.createElement('div',{key, className:'flex items-center gap-3'},
            React.createElement('input',{type:'checkbox',checked:!!report.checklist[key]?.ok,onChange:e=>setChecklistVal(key,{ok:e.target.checked})}),
            React.createElement('label',{className:'flex-1 text-sm'},label),
            Input({className:'w-48',value:(report.checklist[key]?.val||""),onChange:e=>setChecklistVal(key,{val:e.target.value})})
          ))
        ),

        React.createElement('div',{className:'flex gap-2 flex-wrap pt-2'},
          React.createElement('button',{className:'btn bg-gray-700', onClick:()=>setShowSigZ(true)},'✍️ Podpis zákazníka'),
          React.createElement('button',{className:'btn bg-gray-700', onClick:()=>setShowSigT(true)},'✍️ Podpis technika'),
          React.createElement('button',{className:'btn bg-amber-600 text-white',onClick:sharePDF},'Zdieľať PDF'),
          React.createElement('button',{className:'btn bg-emerald-600 text-white',onClick:saveCurrentToArchive},'Uložiť do archívu'),
          React.createElement('button',{className:'btn bg-sky-700 text-white',onClick:newReport},'Nová správa')
        )
      ),

      /* ====== Archív + Nastavenie číslovania ====== */
      React.createElement('aside',{className:'p-4 space-y-3 rounded-xl border border-white/10 bg-white/5'},
        React.createElement('div',{className:'flex items-center justify-between'},
          React.createElement('h3',{className:'text-lg font-semibold'},'Archív (lokálne)'),
          React.createElement('span',{className:'text-xs opacity-70'}, `${loadArchive().length} záznamov`)
        ),
        React.createElement('input',{className:'input w-full', placeholder:'Hľadať číslo / zákazníka / typ…', value:search, onChange:e=>setSearch(e.target.value)}),
        React.createElement('div',{className:'space-y-2 max-h-[50vh] overflow-auto pr-1'},
          ...filteredArchive.map(e=> React.createElement('div',{key:e.id, className:'rounded border border-white/10 p-2 bg-white/10'},
            React.createElement('div',{className:'text-sm font-medium'}, e.cislo, React.createElement('span',{className:'ml-2 text-xs opacity-70'}, `(${e.typ})`)),
            React.createElement('div',{className:'text-xs opacity-80 truncate'}, e.zakaznik || '\u2014'),
            React.createElement('div',{className:'text-xs opacity-60'}, new Date(e.createdAt).toLocaleString()),
            React.createElement('div',{className:'mt-2 flex gap-2'},
              React.createElement('button',{className:'btn bg-gray-700', onClick:()=>loadFromArchive(e)},'Otvoriť'),
              React.createElement('button',{className:'btn bg-amber-700 text-white', onClick:()=>{ setReport(e.data); setTimeout(sharePDF, 0); }},'Zdieľať PDF'),
              React.createElement('button',{className:'btn bg-rose-700 text-white', onClick:()=>deleteEntry(e.id)},'Zmazať')
            )
          ))
        ),
        // Nastavenie číslovania
        React.createElement('div',{className:'mt-2 p-2 rounded border border-white/10'},
          React.createElement('div',{className:'text-sm font-medium mb-2'},'Nastavenie číslovania'),
          React.createElement('div',{className:'flex items-center gap-2 mb-2'},
            React.createElement('input',{className:'input w-24', type:'number', min:2000, max:2100, value:seqYear, onChange:e=>{ const y=+e.target.value||new Date().getFullYear(); setSeqYear(y); setSeqVal(getSeq(y)); }}),
            React.createElement('input',{className:'input w-24', type:'number', min:0, max:9999, value:seqVal, onChange:e=>setSeqVal(Math.max(0, Math.min(9999, +e.target.value||0)))}),
            React.createElement('button',{className:'btn bg-rose-700 text-white', onClick:()=>{ setSeq(seqYear, seqVal); alert(`Nastavené: RS-${seqYear}-${String(seqVal).padStart(4,'0')}`); }},'Nastaviť')
          ),
          React.createElement('div',{className:'text-xs opacity-70'},'Ukladá sa „posledné použité číslo“ pre vybraný rok. Pri ukladaní alebo zdieľaní sa počítadlo posunie dopredu, ak použiješ vyššie číslo.')
        )
      )
    ),

    /* ====== PDF náhľad ====== */
    React.createElement('section',{className:'p-2 rounded-xl border border-white/10 bg-white/5 mt-6'},$1),

    // podpisové modály
    showSigZ && React.createElement(SignaturePad,{ title:'Podpis zákazníka', onSave:(png)=>{ setReport(r=>({...r,podpisZakaznika:png})); setShowSigZ(false); }, onCancel:()=>setShowSigZ(false) }),
    showSigT && React.createElement(SignaturePad,{ title:'Podpis revízneho technika', onSave:(png)=>{ setReport(r=>({...r,podpisTechnika:png})); setShowSigT(false); }, onCancel:()=>setShowSigT(false) })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
