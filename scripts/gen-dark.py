#!/usr/bin/env python3
"""Membangun src/dark-theme.css dari class Tailwind yang dipakai di src/.
Jalankan ulang bila menambah warna terang baru:  python3 scripts/gen-dark.py"""
import re, glob, os
toks=set()
for f in glob.glob('src/**/*.tsx',recursive=True):
    toks|=set(re.findall(r'[A-Za-z0-9:/\[\]\.\-_]+',open(f).read()))
COL='slate|gray|zinc|neutral|stone|emerald|green|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|red|orange|amber|yellow|lime'
SL={'50':'#0b1220','100':'#172033','200':'#26324a','300':'#3a475f'}
BG_SLATE={'50':'#0b1220','100':'#172033','200':'#26324a','300':'#334155'}
TXT_SLATE={'900':'#f1f5f9','800':'#e8edf4','700':'#d5dde9','600':'#b6c2d4','500':'#94a3b8'}
BR_SLATE={'100':'#1e293b','200':'#2b3a52','300':'#3b4b66'}
PAPER=':not(:is(.printable-report,.card-wrapper,.lunch-sheet,.paper-light) *):not(:is(.printable-report,.card-wrapper,.lunch-sheet,.paper-light))'
def esc(t): return re.sub(r'([:/\[\]\.])',r'\\\1',t)
rules=[]
def add(t,decl):
    m=re.match(r'^((?:hover|focus|disabled|group-hover|even|odd|placeholder):)?([a-z\-]+)-(.+)$',t)
    pre=m.group(1) if m else None
    sel='.'+esc(t)
    if pre in ('hover:',): sel+=':hover'
    elif pre in ('focus:',): sel+=':focus'
    elif pre=='disabled:': sel+=':disabled'
    elif pre=='even:': sel+=':nth-child(even)'
    elif pre=='odd:': sel+=':nth-child(odd)'
    elif pre: return
    rules.append(f'html.dark {sel}{PAPER}{{{decl}}}')
for t in sorted(toks):
    m=re.match(rf'^(hover:|focus:|disabled:|even:|odd:)?(bg|text|border|divide|ring|from|to)-({COL}|white)(?:-(\d+))?(?:/(\d+))?$',t)
    if not m: continue
    pre,kind,col,step,op=m.groups(); 
    if col=='white':
        if kind=='bg' and not step: add(t,'background-color:'+('#111a2c' if not op else f'rgba(17,26,44,{int(op)/100})')+'!important')
        continue
    if not step: continue
    step_i=int(step); a=(int(op)/100) if op else 1
    if col in('slate','gray','zinc','neutral','stone'):
        if kind=='bg' and step in BG_SLATE:
            h=BG_SLATE[step].lstrip('#'); r,g,b=[int(h[i:i+2],16) for i in(0,2,4)]
            add(t,f'background-color:rgba({r},{g},{b},{a})!important')
        elif kind=='text' and step in TXT_SLATE: add(t,f'color:{TXT_SLATE[step]}!important')
        elif kind in('border','divide') and step in BR_SLATE:
            if kind=='border': add(t,f'border-color:{BR_SLATE[step]}!important')
        continue
    # warna bertinta
    if kind=='bg' and step_i in(50,100,200):
        mix={50:14,100:20,200:28}[step_i]*a
        add(t,f'background-color:color-mix(in srgb,var(--color-{col}-500) {round(mix)}%,#0f172a)!important')
    elif kind=='border' and step_i in(100,200,300):
        pct={100:30,200:40,300:50}[step_i]
        add(t,f'border-color:color-mix(in srgb,var(--color-{col}-400) {pct}%,#0f172a)!important')
    elif kind=='text' and step_i in(600,700,800,900):
        tgt={600:400,700:300,800:200,900:200}[step_i]
        add(t,f'color:var(--color-{col}-{tgt})!important')
out=['/* DIHASILKAN oleh scripts/gen-dark.py — jangan sunting manual. */',
'@media screen{','html.dark{color-scheme:dark}',
'html.dark body{background:#0b1220}',
'html.dark input,html.dark select,html.dark textarea{color-scheme:dark}',
'html.dark ::placeholder{color:#64748b}']
out+=rules+['}']
open('src/dark-theme.css','w').write('\n'.join(out)+'\n')
print(len(rules),'aturan')
