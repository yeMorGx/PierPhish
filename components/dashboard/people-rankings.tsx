import { useMemo } from "react";
import type {
  CampaignParticipants,
  CampaignSummary,
} from "@/components/dashboard/types";

type RankedPerson = {
  id: string;
  name: string;
  campaigns: number;
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
      const person = people.get(participant.id) ?? {
        id: participant.id,
        name: participant.name.trim() || "Nome não informado",
        campaigns: 0,
        reportedCampaigns: 0,
      };
      person.campaigns += 1;
      if (participant.reported) person.reportedCampaigns += 1;
      people.set(participant.id, person);
    }
  }

  const values = [...people.values()];
  const sortByCount = (first: number, second: number) => second - first;
  return {
    recurring: values
      .filter((person) => person.campaigns > 1)
      .sort(
        (first, second) =>
          sortByCount(first.campaigns, second.campaigns) ||
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
  countField: "campaigns" | "reportedCampaigns";
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
        {!loading && available && people.length > 0 && (
          <div className="people-ranking-peak">
            <strong>{people[0][countField]}</strong>
            <span>
              campanhas
              <br />
              no maior total
            </span>
          </div>
        )}
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
          {people.map((person) => (
            <li key={person.id}>
              <span className="people-ranking-position" aria-hidden="true">
                {String(
                  people.findIndex(
                    (entry) => entry[countField] === person[countField],
                  ) + 1,
                ).padStart(2, "0")}
              </span>
              <span className="people-ranking-person">
                <span className="people-ranking-avatar" aria-hidden="true">
                  {person.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <strong className="people-ranking-name">{person.name}</strong>
              </span>
              <span
                className="people-ranking-count"
                aria-label={metricLabel(person[countField])}
              >
                <strong>{person[countField]}</strong>
                <span>
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
    <>
      <RankingCard
        title="Pessoas mais recorrentes"
        description="Participantes presentes em mais campanhas deste filtro."
        metricLabel={campaignCountLabel}
        countField="campaigns"
        people={rankings.recurring}
        emptyMessage="Nenhuma pessoa aparece em mais de uma campanha neste filtro."
        loading={loading}
        available={available}
      />
      <RankingCard
        title="Pessoas que mais reportam"
        description="Campanhas em que cada pessoa reportou uma mensagem."
        metricLabel={campaignCountLabel}
        countField="reportedCampaigns"
        people={rankings.reporters}
        emptyMessage="Nenhum reporte registrado nas campanhas deste filtro."
        loading={loading}
        available={available}
      />
    </>
  );
}
