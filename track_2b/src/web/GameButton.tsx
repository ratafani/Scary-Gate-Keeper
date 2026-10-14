import type {ButtonHTMLAttributes} from 'react';
const art={settings:'Button - Settings.png',reset:'Background-1.png',log:'Background-2.png',resident:'Background.png',id:'Background-5.png',approve:'Button - Gameplay.png',deny:'Button - Gameplay-2.png'};
export function GameButton({kind,label,active=false,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{kind:keyof typeof art;label:string;active?:boolean}){
 const file=active&&kind==='resident'?'Background-4.png':active&&kind==='id'?'Background-3.png':art[kind];
 return <button {...props} className={`art-button ${kind} ${active?'active':''} ${props.className||''}`} aria-label={label} title={label} aria-pressed={kind==='resident'||kind==='id'?active:undefined}><img src={`/assets/ui/${file}`} alt="" draggable={false}/></button>;
}
