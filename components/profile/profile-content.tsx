"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { Campaign } from "@/components/dashboard/types";
import { ProfileActionsCard } from "@/components/profile/profile-actions-card";
import { ProfileActivityCard } from "@/components/profile/profile-activity-card";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card";
import { ProfileSummaryCard } from "@/components/profile/profile-summary-card";
import { demoCampaigns } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ProfileTotals = {
  campaigns: number;
  people: number;
  delivered: number;
  opened: number;
  clicked: number;
  reported: number;
};

function totalsFromCampaigns(campaigns: Campaign[]): ProfileTotals {
  return campaigns.reduce(
    (current, campaign) => ({
      campaigns: current.campaigns + 1,
      people: current.people + Number(campaign.stats?.total ?? 0),
      delivered: current.delivered + Number(campaign.stats?.delivered ?? 0),
      opened: current.opened + Number(campaign.stats?.opened ?? 0),
      clicked: current.clicked + Number(campaign.stats?.clicked ?? 0),
      reported: current.reported + Number(campaign.stats?.email_reported ?? 0),
    }),
    {
      campaigns: 0,
      people: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      reported: 0,
    },
  );
}

function latestSyncFromCampaigns(campaigns: Campaign[]) {
  return campaigns.reduce<string | null>((latest, campaign) => {
    const current = campaign.synced_at;
    if (!current) return latest;
    if (!latest || Date.parse(current) > Date.parse(latest)) return current;
    return latest;
  }, null);
}

export function ProfileContent() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    isSupabaseConfigured ? [] : demoCampaigns,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const email = user?.email ?? "demo@beephish.local";
  const initial = email.slice(0, 1).toUpperCase();

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadCampaigns() {
      if (!client) return;
      setError(null);
      const { data, error: queryError } = await client
        .from("beephish_campaigns")
        .select("id,name,status,launch_date,synced_at,stats")
        .order("synced_at", { ascending: false });

      if (!mounted) return;
      if (queryError) {
        setError("Não foi possível carregar a atividade agora.");
        setLoading(false);
        return;
      }

      setCampaigns((data ?? []) as Campaign[]);
      setLoading(false);
    }

    void loadCampaigns();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => totalsFromCampaigns(campaigns), [campaigns]);
  const latestCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((first, second) => {
          const firstDate = first.synced_at ?? first.launch_date ?? "";
          const secondDate = second.synced_at ?? second.launch_date ?? "";
          return Date.parse(secondDate) - Date.parse(firstDate);
        })
        .slice(0, 5),
    [campaigns],
  );
  const lastSync = useMemo(
    () => formatDateTime(latestSyncFromCampaigns(campaigns)),
    [campaigns],
  );
  const lastSignIn = user?.last_sign_in_at
    ? formatDateTime(user.last_sign_in_at)
    : null;

  return (
    <div className="grid w-full gap-[var(--cards-gap)] pb-8">
      <ProfileHero email={email} initial={initial} lastSync={lastSync} />
      <ProfileSummaryCard totals={totals} />
      <div className="grid grid-cols-2 gap-[var(--cards-gap)] max-[900px]:grid-cols-1">
        <ProfileIdentityCard email={email} lastSignIn={lastSignIn} />
        <ProfileActionsCard />
      </div>
      <ProfileActivityCard
        campaigns={latestCampaigns}
        error={error}
        loading={loading}
      />
    </div>
  );
}
