import { useMemo } from "react";
import type {
  CampaignParticipants,
  CampaignSummary,
} from "@/components/dashboard/types";

type RankedPerson = {
  id: string;
  name: string;
  clickedCampaigns: number;
  submittedCampaigns: number;
  reportedCampaigns: number;
};

type PeopleRankingsProps = {
  campaigns: CampaignSummary[];
  participantsByCampaign: CampaignParticipants;
  loading: boolean;
  available: boolean;
};

function campaignCountLabel(count: number) {
  return `${count} ${count === 1 ? "campanha" : "campanhas"}`;
}

function buildRankings(
  campaigns: CampaignSummary[],
  participantsByCampaign: CampaignParticipants,
) {
  const people = new Map<string, RankedPerson>();

  for (const campaign of campaigns) {
    const participants = participantsByCampaign[String(campaign.id)] ?? [];
    for (const participant of participants) {
      const person: RankedPerson = people.get(participant.id) ?? {
        id: participant.id,
        name: participant.name.trim() || "Nome não informado",
        clickedCampaigns: 0,
        submittedCampaigns: 0,
        reportedCampaigns: 0,
      };
      if (participant.clicked) person.clickedCampaigns += 1;
      if (participant.submitted) person.submittedCampaigns += 1;
      if (participant.reported) person.reportedCampaigns += 1;
      people.set(participant.id, person);
    }
  }

  const values = [...people.values()];
  const sortByCount = (first: number, second: number) => second - first;
  return {
    clicked: values
      .filter((person) => person.clickedCampaigns > 0)
      .sort(
        (first, second) =>
          sortByCount(first.clickedCampaigns, second.clickedCampaigns) ||
          first.name.localeCompare(second.name, "pt-BR"),
      )
      .slice(0, 5),
    submitted: values
      .filter((person) => person.submittedCampaigns > 0)
      .sort(
        (first, second) =>
          sortByCount(first.submittedCampaigns, second.submittedCampaigns) ||
          first.name.localeCompare(second.name, "pt-BR"),
      )
      .slice(0, 5),
    reporters: values
      .filter((person) => person.reportedCampaigns > 0)
      .sort(
        (first, second) =>
          sortByCount(first.reportedCampaigns, second.reportedCampaigns) ||
          first.name.localeCompare(second.name, "pt-BR"),
      )
      .slice(0, 5),
  };
}

function RankingCard({
  title,
  description,
  metricLabel,
  countField,
  people,
  emptyMessage,
  loading,
  available,
}: {
  title: string;
  description: string;
  metricLabel: (count: number) => string;
  countField: "clickedCampaigns" | "submittedCampaigns" | "reportedCampaigns";
  people: RankedPerson[];
  emptyMessage: string;
  loading: boolean;
  available: boolean;
}) {
  return (
    <article className="surface-card people-ranking-card min-w-0 overflow-hidden rounded-[var(--radius-card)] p-6">
      <header className="people-ranking-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="people-ranking-column-label">Campanhas</span>
      </header>

      {loading ? (
        <p className="people-ranking-state" role="status">
          Carregando resultados das campanhas…
        </p>
      ) : !available ? (
        <p className="people-ranking-state">
          Conecte e sincronize campanhas para consultar os dados de pessoas.
        </p>
      ) : people.length === 0 ? (
        <p className="people-ranking-state">{emptyMessage}</p>
      ) : (
        <ol className="people-ranking-list">
          {people.map((person, index) => (
            <li key={person.id}>
              <span className="people-ranking-position">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="people-ranking-person">
                <span className="people-ranking-identity">
                  <strong className="people-ranking-name">{person.name}</strong>
                </span>
              </span>
              <span
                className="people-ranking-count"
                aria-label={metricLabel(person[countField])}
              >
                <strong>{person[countField]}</strong>
                <span className="sr-only">
                  {" "}
                  {person[countField] === 1 ? "campanha" : "campanhas"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function PeopleRankings({
  campaigns,
  participantsByCampaign,
  loading,
  available,
}: PeopleRankingsProps) {
  const rankings = useMemo(
    () => buildRankings(campaigns, participantsByCampaign),
    [campaigns, participantsByCampaign],
  );

  return (
    <div className="people-rankings-cards">
      <RankingCard
        title="Campanhas clicadas"
        description="Pessoas com cliques em mais campanhas."
        metricLabel={campaignCountLabel}
        countField="clickedCampaigns"
        people={rankings.clicked}
        emptyMessage="Nenhum clique registrado neste filtro."
        loading={loading}
        available={available}
      />
      <RankingCard
        title="Campanhas reportadas"
        description="Pessoas com reportes em mais campanhas."
        metricLabel={campaignCountLabel}
        countField="reportedCampaigns"
        people={rankings.reporters}
        emptyMessage="Nenhum reporte registrado neste filtro."
        loading={loading}
        available={available}
      />
      <RankingCard
        title="Campanhas com dados enviados"
        description="Pessoas que mais enviaram dados nas campanhas."
        metricLabel={campaignCountLabel}
        countField="submittedCampaigns"
        people={rankings.submitted}
        emptyMessage="Nenhum envio de dados registrado neste filtro."
        loading={loading}
        available={available}
      />
    </div>
  );
}
