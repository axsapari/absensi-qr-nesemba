#!/usr/bin/env python3
"""Membangun src/dark-theme.css (tema Gelap) dan src/retro-colors.css (palet Retro)
dari class Tailwind yang dipakai di src/.
Jalankan ulang bila menambah warna terang baru:  python3 scripts/gen-dark.py"""
import re, glob
toks=set()
for f in glob.glob('src/**/*.tsx',recursive=True):
    toks|=set(re.findall(r'[A-Za-z0-9:/\[\]\.\-_]+',open(f).read()))
COL='slate|gray|zinc|neutral|stone|emerald|green|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|red|orange|amber|yellow|lime'
PAPER=':not(:is(.printable-report,.card-wrapper,.lunch-sheet,.paper-light,.paper) *):not(:is(.printable-report,.card-wrapper,.lunch-sheet,.paper-light,.paper))'
def esc(t): return re.sub(r'([:/\[\]\.])',r'\\\1',t)
PALETTES={
 'dark':dict(sel='html.dark',out='src/dark-theme.css',
  BG={'50':'#0b1220','100':'#172033','200':'#26324a','300':'#334155'},
  TXT={'900':'#f1f5f9','800':'#e8edf4','700':'#d5dde9','600':'#b6c2d4','500':'#94a3b8'},
  BR={'100':'#2a364d','200':'#2f3b52','300':'#3b4b66'},
  WHITE='#111a2c',BASE='#0f172a',BODY='#0b1220',PH='#64748b'),
 'retro':dict(sel='html.retro',out='src/retro-colors.css',
  BG={'50':'#020a04','100':'#04140a','200':'#082010','300':'#0d3018'},
  TXT={'900':'#9dffb4','800':'#8af5a2','700':'#6fe38a','600':'#4fc76d','500':'#3a9f55'},
  BR={'100':'#0f4a22','200':'#14612c','300':'#1a7a38'},
  WHITE='#04140a',BASE='#031006',BODY='#010603',PH='#2f7a45'),

 'glass':dict(sel='html.glass',out='src/glass-colors.css',
  BG={'50':(255,255,255,.04),'100':(255,255,255,.07),'200':(255,255,255,.12),'300':(255,255,255,.18)},
  TXT={'900':'#f7f8ff','800':'#eef1ff','700':'#dde3fb','600':'#c4cdf2','500':'#a6b2e0'},
  BR={'100':'rgba(255,255,255,.14)','200':'rgba(255,255,255,.18)','300':'rgba(255,255,255,.26)'},
  WHITE=(255,255,255,.10),BASE='transparent',BODY='#070b2e',PH='#8d99cc',TINT=1.6),
}
def build(P):
    SEL=P['sel']; BG=P['BG']; TXT=P['TXT']; BR=P['BR']; rules=[]
    def hexrgb(h):
        if isinstance(h,tuple): return list(h[:3])
        h=h.lstrip('#'); return [int(h[i:i+2],16) for i in(0,2,4)]
    def alpha(h): return h[3] if isinstance(h,tuple) else 1
    def add(t,decl):
        m=re.match(r'^((?:hover|focus|disabled|group-hover|even|odd|placeholder):)?([a-z\-]+)-(.+)$',t)
        pre=m.group(1) if m else None
        sel='.'+esc(t)
        if pre=='hover:': sel+=':hover'
        elif pre=='focus:': sel+=':focus'
        elif pre=='disabled:': sel+=':disabled'
        elif pre=='even:': sel+=':nth-child(even)'
        elif pre=='odd:': sel+=':nth-child(odd)'
        elif pre: return
        rules.append(f'{SEL} {sel}{PAPER}{{{decl}}}')
    for t in sorted(toks):
        m=re.match(rf'^(hover:|focus:|disabled:|even:|odd:)?(bg|text|border|divide|ring|from|to)-({COL}|white)(?:-(\d+))?(?:/(\d+))?$',t)
        if not m: continue
        pre,kind,col,step,op=m.groups()
        if col=='white':
            if kind=='bg' and not step:
                r,g,b=hexrgb(P['WHITE']); wa=alpha(P['WHITE'])
                if isinstance(P['WHITE'],tuple): add(t,f'background-color:rgba({r},{g},{b},{(wa if (not op or int(op)>=50) else int(op)/100)})!important')
                else: add(t,'background-color:'+(P['WHITE'] if not op else f'rgba({r},{g},{b},{int(op)/100})')+'!important')
            continue
        if not step: continue
        step_i=int(step); a=(int(op)/100) if op else 1
        if col in('slate','gray','zinc','neutral','stone'):
            if kind=='bg' and step in BG:
                r,g,b=hexrgb(BG[step]); add(t,f'background-color:rgba({r},{g},{b},{round(a*alpha(BG[step]),3)})!important')
            elif kind=='text' and step in TXT: add(t,f'color:{TXT[step]}!important')
            elif kind=='border' and step in BR: add(t,f'border-color:{BR[step]}!important')
            elif kind=='divide' and step in BR:
                rules.append(f'{SEL} .{esc(t)}>:not(:last-child){PAPER}{{border-color:{BR[step]}!important}}')
            continue
        if kind=='bg' and step_i in(50,100,200):
            pct=round({50:14,100:20,200:28}[step_i]*a*P.get('TINT',1))
            add(t,f'background-color:color-mix(in srgb,var(--color-{col}-500) {pct}%,{P["BASE"]})!important')
        elif kind=='border' and step_i in(100,200,300):
            pct=min(90,round({100:30,200:40,300:50}[step_i]*P.get('TINT',1)))
            add(t,f'border-color:color-mix(in srgb,var(--color-{col}-400) {pct}%,{P["BASE"]})!important')
        elif kind=='text' and step_i in(600,700,800,900):
            tgt={600:400,700:300,800:200,900:200}[step_i]
            add(t,f'color:var(--color-{col}-{tgt})!important')
    out=['/* DIHASILKAN oleh scripts/gen-dark.py — jangan sunting manual. */',
    '@media screen{',f'{SEL}{{color-scheme:dark}}',
    f'{SEL} body{{background:{P["BODY"]}}}',
    f'{SEL} input,{SEL} select,{SEL} textarea{{color-scheme:dark}}',
    f'{SEL} ::placeholder{{color:{P["PH"]}}}']
    out+=rules+['}']
    open(P['out'],'w').write('\n'.join(out)+'\n')
    print(P['out'],len(rules),'aturan')
for P in PALETTES.values(): build(P)
