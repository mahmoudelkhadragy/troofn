import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ProjectTimeline, TimelineKind } from '../../models/client.model';

/** Text and marker styles per kind of step: T360 milestone, SOW phase, 7SC month. */
const LABEL_CLASS: Record<TimelineKind, string> = {
  milestone: 'font-medium text-brand',
  phase: 'font-medium text-accent',
  monthly: 'text-dim',
};
const DOT_CLASS: Record<TimelineKind, string> = {
  milestone: 'size-[11px] rounded-full bg-brand',
  phase: 'size-[7px] rounded-[2px] bg-accent',
  monthly: 'size-[7px] rounded-[2px] bg-dim',
};

/** "مسار المشروع": the project's milestones, phases and monthly 7SC steps on one line. */
@Component({
  selector: 'tf-project-timeline',
  imports: [DecimalPipe],
  templateUrl: './project-timeline.component.html',
  host: { class: 'block h-[175px] rounded-xl border border-white/7 bg-black-light px-[18px] pt-5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectTimelineComponent {
  readonly timeline = input.required<ProjectTimeline>();

  protected readonly labelClass = (kind: TimelineKind) => LABEL_CLASS[kind];
  protected readonly dotClass = (kind: TimelineKind) => DOT_CLASS[kind];
}
