import Link from "next/link";

export default function NotFound() {
  return <main className="standalone-error"><h1>This episode slipped into another timeline.</h1><p>The requested story does not exist in local storage.</p><Link href="/">Create a new episode</Link></main>;
}
