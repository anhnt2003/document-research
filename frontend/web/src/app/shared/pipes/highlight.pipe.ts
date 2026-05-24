import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { highlight } from '../../core/util/highlight';

@Pipe({ name: 'highlight', standalone: true })
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(text: string, query: string): SafeHtml {
    const html = highlight(text ?? '', query ?? '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
