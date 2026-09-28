import { useCallback, useState } from 'react';
import { ENGINEERING_TOPICS, type EngineeringNote } from '../../../data/note';
import PaperDetails from '../shared/PaperDetails.tsx';

export default function EngineeringNotes() {
  const [selected, setSelected] = useState<EngineeringNote | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <ul className="list-none space-y-1.5 text-[calc(var(--scroll-width)*0.065)] font-normal leading-[1.6] text-[#41443f]" aria-label="工程优化方向">
        {ENGINEERING_TOPICS.map((topic) => (
          <li key={topic.id}>
            <button type="button" aria-haspopup="dialog" aria-expanded={selected?.id === topic.id}
              onClick={() => setSelected(topic)}
              className="pointer-events-auto relative cursor-pointer text-left outline-none after:pointer-events-none after:absolute after:-inset-x-1 after:-inset-y-0.5 after:border-2 after:border-dotted after:border-transparent after:content-[''] hover:text-l1 hover:after:border-l1 focus-visible:text-l1 focus-visible:after:border-l1 active:after:border-l1 aria-expanded:after:border-l1">
              <span aria-hidden="true">- </span>{topic.title}
            </button>
          </li>
        ))}
      </ul>
      {selected && <PaperDetails content={selected} open visible placement="center" onClose={close} />}
    </>
  );
}
