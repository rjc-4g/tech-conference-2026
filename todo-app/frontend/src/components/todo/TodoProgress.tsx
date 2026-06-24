type Props = {
  value: number;
  label?: string;
};

export function TodoProgress({ value, label }: Props) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div>
      {label && <p>{label}：{normalized}%</p>}
      <div className="progress-bar" aria-label={label ?? "進捗"}>
        <div className="progress-fill" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}
