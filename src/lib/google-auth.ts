export async function getValidAccessToken(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data: tokenRow, error } = await supabase
    .from("user_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) return null;

  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  // Token is still valid
  if (expiresAt > now) return tokenRow.access_token;

  // Refresh the token
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshData = await refreshRes.json();
  if (!refreshData.access_token) return null;

  const newExpiresAt = new Date(
    Date.now() + (refreshData.expires_in || 3600) * 1000
  ).toISOString();

  await supabase
    .from("user_google_tokens")
    .update({
      access_token: refreshData.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return refreshData.access_token;
}
