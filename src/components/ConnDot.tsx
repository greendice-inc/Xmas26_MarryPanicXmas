export default function ConnDot({ on }: { on: boolean }) {
  return <span className={`dot ${on ? 'on' : 'off'}`} />
}
