import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { journal } from "@/config/journal";

export const metadata: Metadata = { title: "Terms of use", description: `Terms for using ${journal.name}.` };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="[DD Month YYYY]">
      <p>
        These terms apply to {journal.name} ({journal.fullTitle}), published by {journal.publisher}. By creating an account or using the
        site you agree to them.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>Give accurate details and keep your password safe. You are responsible for activity on your account.</li>
        <li>Accounts are free for readers and authors.</li>
      </ul>

      <h2>Submitting articles</h2>
      <ul>
        <li>
          You confirm the work is original, is not under review elsewhere, that all authors agree to submission, and that you have the
          rights to any material you include.
        </li>
        <li>Every submission goes through editorial check and peer review. Acceptance is at the editors’ discretion.</li>
        <li>
          After submission, authors cannot edit or delete their work directly; corrections and withdrawals are made by request to the
          editorial team, and a version history is kept.
        </li>
        <li>Published articles are released under {journal.licence} unless stated otherwise on the article.</li>
      </ul>

      <h2>Reading and discussion</h2>
      <ul>
        <li>Abstracts are open to everyone; full text, figures and video require a free account.</li>
        <li>
          Comments are moderated. Be respectful and stay on topic; no harassment, spam, or disclosure of others’ personal data. We may
          remove content or suspend accounts that break these rules.
        </li>
      </ul>

      <h2>Content and liability</h2>
      <p>
        Articles reflect the views of their authors. The site is provided “as is”; to the extent permitted by law, {journal.publisher} is
        not liable for indirect losses arising from its use. [Governing law and jurisdiction to be confirmed by the publisher.]
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${journal.editorialEmail}`}>{journal.editorialEmail}</a>
      </p>
    </LegalPage>
  );
}
