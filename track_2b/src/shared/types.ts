export type Language = 'en' | 'de';
export type Action = 'none' | 'turn_around' | 'jump';
export type Card = {printedName:string;printedAddress:string;printedIDNumber:string;birthDay:string;gender:string;expirationDate:string;idAsset:string};
export type Visitor = {id:string;model:string;card:Card;cardImage:string};
export type Shift = {id:string;visitor:Visitor|null;index:number;total:number;score:number;mistakes:number;over:boolean;won:boolean;time:string};
export type Reply = {id:string;encounterId:string;speech:string;action:Action;fallSeconds?:number};
