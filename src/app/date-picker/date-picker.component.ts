import { CommonModule } from '@angular/common';
import { afterRender, Component, ElementRef, forwardRef, HostListener, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ]
})
export class DatePickerComponent implements ControlValueAccessor {

  datePicker = viewChild<ElementRef>('datePicker');

  mode = input<'basic' | 'advanced'>('basic');

  //advanced options
  /**
   * @description max range limit between start & end date
   * @default 30 days
   */
  maxDateRange = input(30);

  /**
   * @description exclude days from selection
   * values = ...[0 - 6]
   * @default 0 - Sunday, 6- Saturday
   */
  excludeDays = input('1,6')


  /**
   * @description disable past date
   * @default false
   */
  disablePastDates = input(false);

  showDatePicker = signal(false);
  leftMonth = new Date();
  rightMonth = new Date(new Date().setMonth(new Date().getMonth() + 1));
  startDate: Date | null = null;
  endDate: Date | null = null;
  hoverDate: Date | null = null;
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  daysInMonthLeft: Date[] = [];
  daysInMonthRight: Date[] = [];

  //adjust picker position
  translateX = 0;
  translateY = 0;

  private value: string | null = null;

  // Callback functions
  onChange = (value: string) => { };
  onTouched = () => { };

  constructor(private elementRef: ElementRef) {
    this.generateDaysForMonth();
    afterRender(() => {
      this.realignPickerPosition();
    });

  }

  //control value accessor overriden methods

  writeValue(obj: any): void {
    if (obj != this.value) {
      this.value = obj;
    }
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    //not required
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showDatePicker() && !this.elementRef.nativeElement.contains(event.target)) {
      this.onPickerToggle();
    }
  }


  get displayDateRange(): string {
    if (this.startDate || this.endDate) {
      return `${this.startDate?.toLocaleDateString()} - ${this.endDate?.toLocaleDateString() ?? 'End Date'}`;
    }
    return this.mode() === 'basic' ? 'Select Date Range' : 'Advanced Date Selection';
  }

  generateDaysForMonth(): void {
    this.daysInMonthLeft = this.generateDays(this.leftMonth);
    this.daysInMonthRight = this.generateDays(this.rightMonth);
  }

  generateDays(date: Date): Date[] {
    const days: Date[] = [];
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startDayIndex = firstDay.getDay();

    for (let i = 1 - startDayIndex; i <= lastDay.getDate(); i++) {
      const day = new Date(date.getFullYear(), date.getMonth(), i);
      days.push(day);
    }
    return days;
  }

  previousMonth(): void {
    this.leftMonth = new Date(this.leftMonth.setMonth(this.leftMonth.getMonth() - 1));
    this.rightMonth = new Date(this.rightMonth.setMonth(this.rightMonth.getMonth() - 1));
    this.generateDaysForMonth();
  }

  nextMonth(): void {
    this.rightMonth = new Date(this.rightMonth.setMonth(this.rightMonth.getMonth() + 1));
    this.leftMonth = new Date(this.leftMonth.setMonth(this.leftMonth.getMonth() + 1));
    this.generateDaysForMonth();
  }

  previousYear(): void {
    this.rightMonth = new Date(this.rightMonth.setFullYear(this.rightMonth.getFullYear() - 1));
    this.leftMonth = new Date(this.leftMonth.setFullYear(this.leftMonth.getFullYear() - 1));
    this.generateDaysForMonth();
  }

  nextYear(): void {
    this.rightMonth = new Date(this.rightMonth.setFullYear(this.rightMonth.getFullYear() + 1));
    this.leftMonth = new Date(this.leftMonth.setFullYear(this.leftMonth.getFullYear() + 1));
    this.generateDaysForMonth();
  }


  selectDate(day: Date): void {
    if (this.isDisabled(day)) return;

    if (!this.startDate || (this.startDate && this.endDate)) {
      this.startDate = day;
      this.endDate = null;
    } else {
      if (day < this.startDate) {
        this.endDate = this.startDate;
        this.startDate = day;
      } else {
        this.endDate = day;
      }
    }
  }

  onDateHover(day: Date): void {
    if (this.isDisabled(day)) return;
    this.hoverDate = this.startDate && !this.endDate ? day : null;
  }

  isDisabled(day: Date): boolean {
    if (this.mode() == 'basic') {
      return false;
    }

    //advanced mode
    let flag = false;

    //disable past dates
    if (this.disablePastDates()) {
      flag = flag || this.isBeforeToday(day);
    }

    //day exclusion
    flag = flag || this.isInExcludedDays(day);

    //range limit
    if (this.startDate) {
      flag = flag || this.isInRangeLimit(day);
    }
    return flag;
  }

  isSelected(day: Date): boolean | null {
    return (
      (this.startDate && this.startDate.toDateString() === day.toDateString()) ||
      (this.endDate && this.endDate.toDateString() === day.toDateString())
    );
  }

  isInRange(day: Date): boolean {
    if (this.startDate && this.endDate) {
      return day > this.startDate && day < this.endDate;
    } else if (this.startDate && !this.endDate) {
      return day > this.startDate && day < this.hoverDate!;
    }
    return false;
  }

  onPickerToggle(): void {
    this.showDatePicker.update((state) => !state);
    if (!this.showDatePicker()) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  getDateDifference(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  applyDateRange(): void {
    this.value = `${this.startDate?.toLocaleDateString()} - ${this.endDate?.toLocaleDateString()}`;
    this.onChange(this.value);
    this.showDatePicker.update(() => false);
  }

  clearDateRange(): void {
    this.startDate = null;
    this.endDate = null;
  }

  private isBeforeToday(day: Date): boolean {
    const today = new Date();
    const dayBefore = new Date(today.setDate(today.getDate() - 1));
    return day < dayBefore;
  }

  private isInExcludedDays(day: Date): boolean {
    const dayOfWeek = day.getDay();
    const excludedDays = this.excludeDays().split(',').map((x) => parseInt(x));
    return excludedDays.includes(dayOfWeek);
  }

  private isInRangeLimit(day: Date): boolean {
    const sDate = new Date(this.startDate!);
    const maxAllowedDate = new Date(sDate.setDate(sDate.getDate() + this.maxDateRange()));
    return day < this.startDate! || day > maxAllowedDate;
  }

  /**
   * @description realigns the picker container if overflows
   * out of the viewport
   */
  private realignPickerPosition() {
    const ele = this.datePicker()?.nativeElement;
    if (ele && this.showDatePicker()) {
      const { x, y, width, height } = ele.getBoundingClientRect();
      const cw = x + width - this.translateX,
        ch = y + height - this.translateY;
      if (cw > window.innerWidth) {
        this.translateX = window.innerWidth - cw;
      }
      if (ch > window.innerHeight) {
        this.translateY = window.innerHeight - ch;
      }
    }
  }

}
