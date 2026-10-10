import { useState } from 'react';
import { taskEstimate } from '../../domain/rollup';
import type { Section } from '../../domain/schema';
import { addRowFocusId } from '../../state/actions';
import { useActions, useFocusRequest } from '../app/useActions';
import { SortableList } from './SortableList';
import styles from './TaskList.module.css';
import { TaskRow } from './TaskRow';

function AddTaskRow({ sectionId }: { sectionId: string }) {
  const actions = useActions();
  const ref = useFocusRequest<HTMLTextAreaElement>(addRowFocusId(sectionId));
  const [text, setText] = useState('');
  return (
    <textarea
      ref={ref}
      rows={1}
      className={`${styles.add} nodrag`}
      placeholder="Add a task"
      aria-label="Add a task"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        if (!text.trim()) return;
        actions.addTask(sectionId, text.trim());
        setText('');
      }}
    />
  );
}

export function TaskList({ section }: { section: Section }) {
  const actions = useActions();
  const move = (id: string, toIndex: number) => {
    actions.moveTo(section.id, id, toIndex);
  };
  return (
    <div className={styles.list}>
      <SortableList ids={section.tasks.map((t) => t.id)} onMove={move}>
        <ul className={styles.items}>
          {section.tasks.map((task) => (
            <TaskRow
              key={task.id}
              sectionId={section.id}
              item={task}
              rollup={task.subtasks.length > 0 ? taskEstimate(task) : undefined}
            >
              {task.subtasks.length > 0 && (
                <SortableList ids={task.subtasks.map((s) => s.id)} onMove={move}>
                  <ul className={styles.items}>
                    {task.subtasks.map((sub) => (
                      <TaskRow key={sub.id} sectionId={section.id} item={sub} parentId={task.id} />
                    ))}
                  </ul>
                </SortableList>
              )}
            </TaskRow>
          ))}
        </ul>
      </SortableList>
      <AddTaskRow sectionId={section.id} />
    </div>
  );
}
