export async function deleteUserAccountData(supabase: any, userId: string) {
  await supabase.from("analytics_events").delete().eq("user_id", userId);
  await supabase.from("business_page_analytics").delete().eq("user_id", userId);

  await supabase.from("wallet_items").delete().eq("user_id", userId);
  await supabase.from("wallet_folders").delete().eq("user_id", userId);

  await supabase.from("share_links").delete().eq("created_by", userId);
  await supabase.from("media").delete().eq("uploaded_by", userId);

  await supabase.from("business_members").delete().eq("user_id", userId);
  await supabase.from("business_members").delete().eq("invited_by", userId);

  await supabase.from("pages").delete().eq("created_by", userId);
  await supabase.from("business_pages").delete().eq("created_by", userId);

  const { data: ownedBusinesses } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);

  if (ownedBusinesses?.length) {
    for (const business of ownedBusinesses) {
      await supabase.from("business_page_analytics").delete().eq("business_id", business.id);
      await supabase.from("business_pages").delete().eq("business_id", business.id);
      await supabase.from("pages").delete().eq("business_id", business.id);
      await supabase.from("media").delete().eq("business_id", business.id);
      await supabase.from("business_members").delete().eq("business_id", business.id);
    }

    await supabase.from("businesses").delete().eq("owner_id", userId);
  }

  const { data: ownedOrganizations } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId);

  if (ownedOrganizations?.length) {
    await supabase.from("organizations").delete().eq("owner_id", userId);
  }

  await supabase.from("users").delete().eq("id", userId);
}
