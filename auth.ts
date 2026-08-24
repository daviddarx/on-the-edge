import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      // GitHub enabled RFC 9207 in April 2026 and now returns an `iss` param on
      // the OAuth callback. Without this, Auth.js falls back to a placeholder
      // issuer and the callback fails. Baked into @auth/core >= 0.41.2.
      issuer: "https://github.com/login/oauth",
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.username = user.username
      }
      return token
    },
    session({ session, token }) {
      if (token.username) {
        session.user.username = token.username as string
      }
      session.isOwner = token.username === process.env.GITHUB_OWNER
      return session
    },
  },
})
