import { Pipe, PipeTransform } from '@angular/core';
import { relative } from '../../core/util/date';

@Pipe({ name: 'relativeDate', standalone: true })
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    return relative(value);
  }
}
