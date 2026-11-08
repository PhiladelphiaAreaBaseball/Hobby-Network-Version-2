import { Page, PageHead, Notice } from "../components/ui";
export function ComingSoon({ title }: { title: string }) { return <Page><PageHead title={title} /><Notice kind="warn">This screen is still being built in this session. It is listed here so navigation never dead-ends; the implementation checklist in docs/CHECKLIST.md tracks it.</Notice></Page>; }
