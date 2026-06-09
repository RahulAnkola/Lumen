import { Icon } from "./Icon";

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="lm-empty lm-reveal">
      <div className="lm-empty-mark"><Icon name={icon} size={30} /></div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
