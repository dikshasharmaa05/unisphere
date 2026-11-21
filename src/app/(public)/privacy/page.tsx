import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { journal } from "@/config/journal";

export const metadata: Metadata = { title: "Privacy policy", description: `How ${journal.name} collects and uses personal data.` };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy" updated="[DD Month YYYY]">
      <p>
        This policy explains what personal data {journal.name} ({journal.fullTitle}), published by {journal.publisher}, collects, why, and
        the choices you have. Questions: <a href={`mailto:${journal.editorialEmail}`}>{journal.editorialEmail}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> — your name, email address, password (stored only as a secure hash by our authentication
          provider), affiliation, and optionally your ORCID iD.
        </li>
        <li>
          <strong>Google sign-in</strong> — if you choose “Continue with Google”, Google shares your name, email address and profile
          picture with us. We do not receive your Google password or access to any other Google data.
        </li>
        <li>
          <strong>Submissions</strong> — manuscripts, figures, data, video and the author details you provide when submitting an article.
        </li>
        <li>
          <strong>Activity</strong> — comments, likes and change requests you make, and basic technical data (such as IP address and
          browser type) kept in server logs for security.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and sign you in.</li>
        <li>To handle submissions through editorial check, peer review and publication.</li>
        <li>
          To show author names, affiliations and ORCID iDs on published articles — this is part of scholarly publishing. Your account
          profile itself is not public.
        </li>
        <li>To send emails about your account and submissions (for example verification, password reset and status updates).</li>
        <li>To keep the service secure and prevent abuse.</li>
      </ul>
      <p>We do not sell personal data and we do not show advertising based on it.</p>

      <h2>Peer review</h2>
      <p>
        The journal runs [double-blind] peer review: reviewers do not see author identities and authors do not see reviewer identities.
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Supabase — database, authentication and file storage.</li>
        <li>Vercel — website hosting.</li>
        <li>Email delivery provider — transactional emails.</li>
        <li>Research Organization Registry (ROR) — institution names you type are sent to ROR to suggest matches.</li>
        <li>Crossref — article metadata (titles, authors, affiliations) is registered with Crossref when a DOI is assigned.</li>
      </ul>

      <h2>Cookies</h2>
      <p>We use essential cookies only, to keep you signed in. No advertising or third-party tracking cookies.</p>

      <h2>How long we keep it</h2>
      <p>
        Account data is kept while your account is open. Published articles and their author details are part of the permanent scholarly
        record and are kept indefinitely. [Retention periods for other data to be confirmed by the publisher.]
      </p>

      <h2>Your rights</h2>
      <p>
        You can view and edit your profile on your account page. You may ask for a copy of your data, its correction, or deletion of your
        account by emailing <a href={`mailto:${journal.editorialEmail}`}>{journal.editorialEmail}</a>. Depending on where you live you may
        also have the right to complain to a data-protection authority.
      </p>

      <h2>Changes</h2>
      <p>We will post any changes here and update the date above.</p>
    </LegalPage>
  );
}
