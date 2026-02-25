import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
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
