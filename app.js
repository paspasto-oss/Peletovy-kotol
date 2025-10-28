/* global React, ReactDOM, html2pdf */
const { useEffect, useRef, useState } = React;

/* ---------- Pomôcky ---------- */
const pad2 = (n)=>String(n).padStart(2,"0");
const todayStr = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const genReportNo = ()=>{ const d=new Date(); return `RS-${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`; };

/* 16 bodov – kľúče musia sedieť s DEFAULT_CHECKLIST */
const CHECKLIST = [
  ["vizual", "Vizuálna prehliadka zariadenia (stav, korózia, tesnosť)"],
  ["vyrobneCislo", "Výrobné číslo kotla"],
  ["typKotla", "Typ kotla / výkon"],
  ["spaliny", "Hodnoty spalín (CO/CO₂/O₂/ťah/teplota)"],
  ["tlakZaReg", "Tlak plynu za regulátorom (mbar)"],
  ["tesnost", "Skúška tesnosti plynu (OK/NG)"],
  ["poistnyVentil", "Kontrola poistného ventilu"],
  ["bezpPrvky", "Bezpečnostné prvky – funkčná skúška"],
  ["horak", "Horák – stav, vyčistenie"],
  ["filter", "Čistenie filtrov plynu/vody"],
  ["komin", "Dymovod/komín – napojenie, ťah"],
  ["spojky", "Armatúry a spoje – únik/tesnosť"],
  ["elektro", "Elektrické pripojenie a uzemnenie – kontrola"],
  ["voda", "Tlak inštalácie / expanzná nádoba (bar)"],
  ["regulator", "Regulátor tlaku plynu – výrobné číslo"],
  ["zaznam", "Záznam o zistených nedostatkoch a poučenie obsluhy"]
];

const DEFAULT_CHECKLIST = {
  vizual: { ok: true, val: "Bez korózie, tesné; kryty kompletné" },
  vyrobneCislo: { ok: true, val: "PTC24-2309-0011876" },
  typKotla: { ok: true, val: "Protherm Tiger Condens 24/28 KKO • 24 kW" },
  spaliny: { ok: true, val: "CO 8 ppm • CO₂ 9.2 % • O₂ 5.1 % • ťah 12 Pa • T 65 °C" },
  tlakZaReg: { ok: true, val: "18 mbar (pri záťaži)" },
  tesnost: { ok: true, val: "OK – úbytok 0 mbar / 5 min" },
  poistnyVentil: { ok: true, val: "Funkčný – skúška otvorenia bez úniku" },
  bezpPrvky: { ok: true, val: "STB a presostat funkčné, reakcia v limite" },
  horak: { ok: true, val: "Vyčistený, bez usadenín" },
  filter: { ok: true, val: "Filter plynu a vody vyčistený" },
  komin: { ok: true, val: "Koaxiál DN60/100, dĺžka 2,3 m, ťah stabilný" },
  spojky: { ok: true, val: "Bez únikov (penová skúška)" },
  elektro: { ok: true, val: "Uzemnenie OK, polarita správna" },
  voda: { ok: true, val: "1.3 bar (expanzná 0.9 bar)" },
  regulator: { ok: true, val: "RS-2309-11876" },
  zaznam: { ok: true, val: "Bez závad. Poučenie obsluhy; ďalšia kontrola o 12 mes." }
};

const DEFAULT = () => ({
  cislo: genReportNo(),
  datum: todayStr(),
  zakaznik: {
    nazov: "Bytový dom Hurbanova 12",
    adresa: "Hurbanova 12, 015 01 Rajec",
    ico: "36789012",
    dic: "2023456789",
    email: "spravca@bd-hurbanova.sk",
  },
  checklist: { ...DEFAULT_CHECKLIST },
  logoUrl: "./assets/logo-spektrainstall.png",
  podpisTechnikaStampUrl: "./assets/podpis-technika.png",
  podpisZakaznika: "",
  podpisTechnika: "",
});

/* ------------- podpis plátno ------------- */
function SignaturePad({ title="Podpis", onSave, onCancel }){
  const ref = useRef(null), ctxRef = useRef(null);
  const drawing = useRef(false), last = useRef({x:0,y:0});
  useEffect(()=>{
    const cvs=ref.current, dpr=window.devicePixelRatio||1;
    const r=cvs.getBoundingClientRect(); cvs.width=r.width*dpr; cvs.height=r.height*dpr;
    const ctx=cvs.getContext('2d'); ctx.scale(dpr,dpr); ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle='#111'; ctxRef.current=ctx;
    const get=(e)=>{const t=e.touches?e.touches[0]:e;const cr=cvs.getBoundingClientRect();return{x:t.clientX-cr.left,y:t.clientY-cr.top}};
    const start=(e)=>{e.preventDefault();drawing.current=true;last.current=get(e)};
    const move=(e)=>{if(!drawing.current)return;e.preventDefault();const p=get(e),ctx=ctxRef.current;ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();last.current=p};
    const end=(e)=>{e.preventDefault();drawing.current=false};
    const opt={passive:false};
    cvs.addEventListener('mousedown',start,opt); cvs.addEventListener('mousemove',move,opt); window.addEventListener('mouseup',end,opt);
    cvs.addEventListener('touchstart',start,opt); cvs.addEventListener('touchmove',move,opt); cvs.addEventListener('touchend',end,opt);
    return()=>{cvs.removeEventListener('mousedown',start,opt);cvs.removeEventListener('mousemove',move,opt);window.removeEventListener('mouseup',end,opt);
      cvs.removeEventListener('touchstart',start,opt);cvs.removeEventListener('touchmove',move,opt);cvs.removeEventListener('touchend',end,opt)};
  },[]);
  const clear=()=>{const cvs=ref.current,ctx=ctxRef.current;ctx.clearRect(0,0,cvs.width,cvs.height)};
  return React.createElement('div',{className:'fixed inset-0 bg-black/60 grid place-items-center',onClick:onCancel},
    React.createElement('div',{className:'bg-white rounded-2xl w-[90vw] max-w-lg p-4',onClick:e=>e.stopPropagation()},
      React.createElement('div',{className:'text-lg font-semibold mb-2'},title),
      React.createElement('canvas',{ref:ref,className:'w-full h-40 rounded border'}),
      React.createElement('div',{className:'mt-3 flex justify-between'},
        React.createElement('button',{className:'btn bg-gray-200',onClick:clear},"Vymazať"),
        React.createElement('div',null,
          React.createElement('button',{className:'btn bg-gray-200 mr-2',onClick:onCancel},"Zrušiť"),
          React.createElement('button',{className:'btn bg-emerald-600 text-white',onClick:()=>onSave(ref.current.toDataURL('image/png'))},"Uložiť podpis")
        )
      )
    )
  );
}

/* ------------- PDF drobnosti ------------- */
function Metric({label,value}){
  return React.createElement('div',{className:'border rounded p-2 bg-white'},
    React.createElement('div',{className:'text-[10px] text-neutral-500 mb-1'},label),
    React.createElement('div',{className:'font-medium text-[12px] leading-tight text-neutral-900'},value||'—')
  );
}
function SignBox({title,img,stamp}){
  return React.createElement('div',null,
    React.createElement('div',{className:'h-[95px] border rounded p-2 flex items-center justify-center bg-white relative overflow-hidden'},
      stamp && React.createElement('img',{src:stamp,className:'absolute inset-0 m-auto max-h-[90px] opacity-90'}),
      img ? React.createElement('img',{src:img,className:'relative max-h-[85px] object-contain'}) : React.createElement('span',{className:'text-xs text-neutral-400 relative'},`(${title.toLowerCase()})`)
    ),
    React.createElement('div',{className:'text-center text-xs mt-1'},title)
  );
}

/* ------------- Hlavná App ------------- */
function App(){
  const [report,setReport]=useState(()=>DEFAULT());
  const [showSigZ,setShowSigZ]=useState(false);
  const [showSigT,setShowSigT]=useState(false);

  // istota: ak by sa datum nenaplnil, doplň ho
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(report.datum)) {
      setReport(r => ({ ...r, datum: todayStr() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setChecklistVal=(key, patch)=> setReport(r=>({
    ...r, checklist: { ...r.checklist, [key]: { ...(r.checklist[key]||{}), ...patch } }
  }));

  /* ---------- SHARE PDF (OneDrive/Mail/Tlač) – 1x A4 ---------- */
  const sharePDF = async () => {
    const wrapper = document.getElementById('pdf-wrapper');
    const sheet   = document.getElementById('pdf-sheet');

    // kompaktné medzery len počas generovania
    sheet.classList.add('pdf-compact');

    // čakaj na fonty/obrázky
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch {} }
    const imgs = wrapper.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));

    const A4W = 794, A4H = 1123; // 96dpi
    const filename = `Revízna_sprava-${(typeof report?.cislo === 'string' ? report.cislo : 'report')}.pdf`;

    // škálovanie, ak by náhodou presahovalo
    const prev = { transform: wrapper.style.transform, transformOrigin: wrapper.style.transformOrigin, width: wrapper.style.width, height: wrapper.style.height };
    const realW = Math.ceil(wrapper.scrollWidth), realH = Math.ceil(wrapper.scrollHeight);
    if (realW > A4W || realH > A4H) {
      const scale = Math.min(A4W/realW, A4H/realH);
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.width  = `${A4W}px`;
      wrapper.style.height = `${A4H}px`;
    }

    try {
      // PDF ako Blob
      const worker = html2pdf().set({
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2, useCORS: true, allowTaint: true, scrollY: 0, backgroundColor: '#ffffff',
          width: A4W, height: A4H, windowWidth: A4W, windowHeight: A4H, letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: [] }
      }).from(wrapper);

      const pdf = await worker.toPdf().get('pdf');
      const blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });

      // 1) Share Sheet (Android/iOS – OneDrive/Mail/Tlač)
      if (navigator.canShare) {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'Revízna správa', text: 'Revízna správa v PDF (1× A4)' });
            return;
          } catch (_) { /* zrušené používateľom */ }
        }
      }

      // 2) Fallback: otvor PDF do novej karty + skús tlač
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) { setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400); }
      else {
        // 3) Posledný fallback: stiahni súbor
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 2000);

    } finally {
      // upratať do pôvodného stavu
      sheet.classList.remove('pdf-compact');
      wrapper.style.transform       = prev?.transform || '';
      wrapper.style.transformOrigin = prev?.transformOrigin || '';
      wrapper.style.width           = prev?.width || '';
      wrapper.style.height          = prev?.height || '';
    }
  };

  /* ---------- UI ---------- */
  const Input = (props)=>React.createElement('input',{...props,className:`input w-full ${props.className||""}`});

  return React.createElement('div',{className:'max-w-6xl mx-auto px-4 py-6'},
    React.createElement('div',{className:'grid grid-cols-1 lg:grid-cols-2 gap-6'},

      /* --------- ĽAVO: EDITOR --------- */
      React.createElement('section',{className:'card p-4 space-y-4'},
        React.createElement('h2',{className:'text-xl font-semibold'},"Údaje"),
        React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 gap-3'},

          React.createElement('label', null, "Názov",
            Input({ value: report.zakaznik.nazov,
              onChange:e=>setReport(r=>({...r, zakaznik:{...r.zakaznik, nazov:e.target.value}}))
            })
          ),

          React.createElement('label', null, "Adresa",
            Input({ value: report.zakaznik.adresa,
              onChange:e=>setReport(r=>({...r, zakaznik:{...r.zakaznik, adresa:e.target.value}}))
            })
          ),

          React.createElement('label', null, "IČO",
            Input({ value: report.zakaznik.ico,
              onChange:e=>setReport(r=>({...r, zakaznik:{...r.zakaznik, ico:e.target.value}}))
            })
          ),

          React.createElement('label', null, "DIČ",
            Input({ value: report.zakaznik.dic,
              onChange:e=>setReport(r=>({...r, zakaznik:{...r.zakaznik, dic:e.target.value}}))
            })
          ),

          React.createElement('label', { className:'md:col-span-2' }, "E-mail",
            Input({ type:'email', value: report.zakaznik.email,
              onChange:e=>setReport(r=>({...r, zakaznik:{...r.zakaznik, email:e.target.value}}))
            })
          ),

          React.createElement('label', { className:'md:col-span-2' }, "Dátum revízie",
            React.createElement('input', {
              type: 'date',
              className: 'input w-full',
              value: report.datum,                // YYYY-MM-DD
              onChange: e => setReport(r => ({ ...r, datum: e.target.value }))
            })
          )
        ),

        React.createElement('h3',{className:'text-lg font-semibold'},"Merania – rýchle polia"),
        React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 gap-3'},
          React.createElement('label',null,"Spaliny",Input({value:report.checklist.spaliny.val,onChange:e=>setChecklistVal('spaliny',{val:e.target.value})})),
          React.createElement('label',null,"Tlak plynu za regulátorom (mbar)",Input({value:report.checklist.tlakZaReg.val,onChange:e=>setChecklistVal('tlakZaReg',{val:e.target.value})})),
          React.createElement('label',null,"Tlak systému / expanzná nádoba",Input({value:report.checklist.voda.val,onChange:e=>setChecklistVal('voda',{val:e.target.value})})),
          React.createElement('label',null,"Komín / ťah",Input({value:report.checklist.komin.val,onChange:e=>setChecklistVal('komin',{val:e.target.value})}))
        ),

        React.createElement('h3',{className:'text-lg font-semibold'},"Kontrolný zoznam – Plynový kotol"),
        React.createElement('div',{className:'grid grid-cols-1 gap-3'},
          CHECKLIST.map(([key,label])=>React.createElement('div',{key, className:'flex items-center gap-3'},
            React.createElement('input',{type:'checkbox',checked:!!report.checklist[key]?.ok,onChange:e=>setChecklistVal(key,{ok:e.target.checked})}),
            React.createElement('label',{className:'flex-1 text-sm'},label),
            Input({className:'w-48',value:(report.checklist[key]?.val||""),onChange:e=>setChecklistVal(key,{val:e.target.value})})
          ))
        ),

        React.createElement('div',{className:'flex gap-2 flex-wrap pt-2'},
          React.createElement('button',{className:'btn bg-gray-700',onClick:()=>setShowSigZ(true)},"✍️ Podpis zákazníka"),
          React.createElement('button',{className:'btn bg-gray-700',onClick:()=>setShowSigT(true)},"✍️ Podpis technika"),
          React.createElement('button',{className:'btn bg-amber-600 text-white',onClick:sharePDF},"Zdieľať PDF")
        )
      ),

      /* --------- PRAVO: PDF PREVIEW --------- */
      React.createElement('section',{className:'card p-2'},
        React.createElement('div',{id:'pdf-wrapper',className:'mx-auto',style:{background:'#fff',width:'210mm',height:'297mm',overflow:'hidden',display:'flex',justifyContent:'center',alignItems:'flex-start'}},
          React.createElement('div',{id:'pdf-sheet',className:'sheet w-[210mm] h-[297mm]'},
            /* hlavička */
            React.createElement('div',{className:'p-6 border-b flex gap-4 items-start'},
              React.createElement('div',{className:'w-20 h-20 rounded bg-white grid place-items-center overflow-hidden'},
                React.createElement('img',{src:report.logoUrl,className:'object-contain w-full h-full'})
              ),
              React.createElement('div',{className:'flex-1'},
                React.createElement('div',{className:'text-xl font-bold'},"Spektra Install"),
                React.createElement('div',{className:'text-xs leading-5'},
                  React.createElement('div',null,React.createElement('b',null,'IČO:'),' 53690036'),
                  React.createElement('div',null,React.createElement('b',null,'Sídlo:'),' Rajecká Lesná 98, 01315')
                )
              ),
              React.createElement('div',{className:'text-right'},
                React.createElement('div',{className:'text-xs'},'Číslo správy:'),
                React.createElement('div',{className:'text-lg font-semibold'},report.cislo),
                React.createElement('div',{className:'text-xs'},'Dátum: ',report.datum)
              )
            ),

            /* bloky zákazník / zariadenie */
            React.createElement('div',{className:'px-6 pt-4 grid grid-cols-2 gap-4'},
              React.createElement('div',{className:'border rounded p-3 text-xs'},
                React.createElement('div',{className:'font-semibold mb-1'},"Zákazník"),
                React.createElement('div',null,report.zakaznik.nazov),
                React.createElement('div',null,report.zakaznik.adresa),
                React.createElement('div',null,'IČO: ',report.zakaznik.ico,' • DIČ: ',report.zakaznik.dic,' • e-mail: ',report.zakaznik.email)
              ),
              React.createElement('div',{className:'border rounded p-3 text-xs'},
                React.createElement('div',{className:'font-semibold mb-1'},"Zariadenie"),
                React.createElement('div',null,'Plynový kotol'),
                React.createElement('div',null,'Výrobné číslo: ',report.checklist.vyrobneCislo.val)
              )
            ),

            /* 4 metriky */
            React.createElement('div',{className:'px-6 pt-3 grid grid-cols-4 gap-3 text-xs'},
              React.createElement(Metric,{label:'Spaliny',value:report.checklist.spaliny.val}),
              React.createElement(Metric,{label:'Tlak plynu za regulátorom',value:report.checklist.tlakZaReg.val}),
              React.createElement(Metric,{label:'Tlak systému / expanzná nádoba',value:report.checklist.voda.val}),
              React.createElement(Metric,{label:'Komín / ťah',value:report.checklist.komin.val}),
            ),

            /* tabuľka 16 bodov */
            React.createElement('div',{className:'px-6 pt-3'},
              React.createElement('table',null,
                React.createElement('thead',null,
                  React.createElement('tr',null,
                    React.createElement('th',null,'Bod'),
                    React.createElement('th',null,'OK'),
                    React.createElement('th',null,'Hodnota / Poznámka'),
                  )
                ),
                React.createElement('tbody',null,
                  CHECKLIST.map(([key,label])=>React.createElement('tr',{key},
                    React.createElement('td',null,label),
                    React.createElement('td',null, report.checklist[key]?.ok ? '✔' : '—'),
                    React.createElement('td',null, report.checklist[key]?.val || '')
                  ))
                )
              )
            ),

            /* podpisy */
            React.createElement('div',{className:'px-6 pt-4 grid grid-cols-2 gap-6 items-end'},
              React.createElement(SignBox,{title:'Podpis zákazníka', img:report.podpisZakaznika}),
              React.createElement(SignBox,{title:'Podpis revízneho technika', img:report.podpisTechnika, stamp:report.podpisTechnikaStampUrl})
            ),

            React.createElement('div',{className:'px-6 pb-4 text-[10px] text-neutral-600'},
              React.createElement('b',null,'Normy a predpisy: '),' STN EN 15502-1/2; STN 38 6441; STN 07 0703'
            )
          )
        )
      )
    ),

    showSigZ && React.createElement(SignaturePad,{title:"Podpis zákazníka",onSave:(png)=>{setReport(r=>({...r,podpisZakaznika:png}));setShowSigZ(false);},onCancel:()=>setShowSigZ(false)}),
    showSigT && React.createElement(SignaturePad,{title:"Podpis revízneho technika",onSave:(png)=>{setReport(r=>({...r,podpisTechnika:png}));setShowSigT(false);},onCancel:()=>setShowSigT(false)})
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
