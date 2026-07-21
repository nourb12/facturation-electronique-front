import { Pipe, PipeTransform } from '@angular/core';
import { KanbanColonne } from './kanban.model';

const LABELS: Record<KanbanColonne, string> = {
  todo: 'À faire',
  doing: 'En cours',
  done: 'Terminé',
};

@Pipe({ name: 'findCol', standalone: true })
export class FindColPipe implements PipeTransform {
  transform(_: { id: KanbanColonne; label: string }[], id: KanbanColonne): string {
    return LABELS[id] ?? id;
  }
}
