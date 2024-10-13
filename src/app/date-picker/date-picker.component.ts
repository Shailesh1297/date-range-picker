import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, forwardRef, input, OnDestroy, Renderer2, signal } from '@angular/core';
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
export class DatePickerComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {

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

  private value: string | null = null;

  private documentClickListener: (() => void) | undefined;

  // Callback functions
  onChange = (value: string) => {};
  onTouched = () => {};

  constructor(private renderer: Renderer2, private elementRef: ElementRef) {
    this.generateDaysForMonth();
  }

  //control value accessor overriden methods

  writeValue(obj: any): void {
    if(obj != this.value) {
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

  ngAfterViewInit(): void {
    this.documentClickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
      if (this.showDatePicker && !this.elementRef.nativeElement.contains(event.target)) {
        this.showDatePicker.update(() => false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.documentClickListener) {
      this.documentClickListener();
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
    this.hoverDate = this.startDate && !this.endDate ? day: null;
  }

  isDisabled(day: Date): boolean {
    if(this.mode() == 'basic') {
      return false;
    }
    let flag = false;
    let today = new Date();

    //disable past dates
    if(this.disablePastDates()) {
      const dayBefore = new Date(today.setDate(today.getDate() - 1));
      flag = flag || day < dayBefore;
    }

    //day exclusion
    const dayOfWeek = day.getDay();
    const excludedDays = this.excludeDays().split(',').map((x) => parseInt(x));
    flag = flag || excludedDays.includes(dayOfWeek);

    //range limit
    if(this.startDate) {
      today = new Date();
      const maxAllowedDate = new Date(today.setDate(today.getDate() + this.maxDateRange()));
      flag =  flag || (day < new Date() || day > maxAllowedDate);
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
    }else  if (this.startDate && !this.endDate) {
      return day > this.startDate && day < this.hoverDate!;
    }
    return false;
  }

  onInputFocus(): void {
    this.showDatePicker.update((state) => !state);
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

}
