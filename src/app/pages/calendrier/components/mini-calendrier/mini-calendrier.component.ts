import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendrierService } from '../../services/calendrier.service';
interface MiniDay { date: Date; dayNum: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; hasEvent: boolean; }
@Component({ selector: 'app-mini-calendrier', standalone: true, imports: [CommonModule], templateUrl: './mini-calendrier.component.html', styleUrls: ['./mini-calendrier.component.scss'] })
export class MiniCalendrierComponent {
  svc = inject(CalendrierService);
  DAY_LABELS = ['L','M','M','J','V','S','D'];
  monthLabel = computed(() => this.svc.currentDate().toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
  days = computed<MiniDay[]>(() => {
    const cur=this.svc.currentDate(), sel=this.svc.selectedDate(), today=new Date();
    const y=cur.getFullYear(), m=cur.getMonth();
    const first=new Date(y,m,1), last=new Date(y,m+1,0);
    const days:MiniDay[]=[];
    const evts=this.svc.events();
    let dow=first.getDay(); dow=dow===0?6:dow-1;
    for(let i=dow-1;i>=0;i--){const d=new Date(y,m,-i);days.push({date:d,dayNum:d.getDate(),isCurrentMonth:false,isToday:false,isSelected:false,hasEvent:false});}
    for(let d=1;d<=last.getDate();d++){const dt=new Date(y,m,d);days.push({date:dt,dayNum:d,isCurrentMonth:true,isToday:this._s(dt,today),isSelected:this._s(dt,sel),hasEvent:evts.some(e=>this._s(e.date,dt))});}
    while(days.length<42){const d=new Date(y,m+1,days.length-last.getDate()-dow+1);days.push({date:d,dayNum:d.getDate(),isCurrentMonth:false,isToday:false,isSelected:false,hasEvent:false});}
    return days;
  });
  select(day:MiniDay){this.svc.selectedDate.set(day.date);if(!day.isCurrentMonth)this.svc.currentDate.set(new Date(day.date.getFullYear(),day.date.getMonth(),1));}
  private _s(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
}
