import { Component, Input } from '@angular/core';

let nextTooltipId = 0;

@Component({
  selector: 'app-term-tooltip',
  standalone: true,
  templateUrl: './term-tooltip.component.html',
  styleUrls: ['./term-tooltip.component.scss']
})
export class TermTooltipComponent {
  @Input() acronym = '';
  @Input() fullName = '';
  @Input() description = '';
  @Input() source = '';

  readonly tooltipId = `term-tooltip-${++nextTooltipId}`;

  get tone(): string {
    const key = this.acronym.toLowerCase();

    if (key.includes('teif')) return 'teif';
    if (key.includes('ubl')) return 'ubl';
    if (key.includes('ttn') || key.includes('fatoora')) return 'ttn';
    if (key.includes('fodec')) return 'fodec';
    if (key.includes('kyc')) return 'kyc';
    if (key.includes('aes')) return 'aes';
    if (key.includes('rne')) return 'rne';

    return 'default';
  }

  get ariaLabel(): string {
    return `${this.acronym} : ${this.fullName}`;
  }
}
