import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatePickerComponent } from "./date-picker/date-picker.component";
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,ReactiveFormsModule, DatePickerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  title = 'date-range-picker';

  dateForm = new FormGroup({
    mode: new FormControl<'basic' | 'advanced'>('basic', {nonNullable: true}),
    range: new FormControl({value: 30, disabled: true}, {nonNullable: true}),
    exclude: new FormControl({value: '0,6', disabled: true}, {nonNullable: true}),
    past: new FormControl({value: false, disabled: true}, {nonNullable: true}),
    date: new FormControl('')
  });

  ngOnInit(): void {
    this.dateForm.controls['mode'].valueChanges.subscribe((mode) => {
      if(mode != 'advanced') {
        this.dateForm.controls['range'].disable();
        this.dateForm.controls['exclude'].disable();
        this.dateForm.controls['past'].disable();
      }else {
        this.dateForm.controls['range'].enable();
        this.dateForm.controls['exclude'].enable();
        this.dateForm.controls['past'].enable();
      }
    })
    this.dateForm.valueChanges.subscribe((data) => {
      console.log(data);
    });
  }

}
