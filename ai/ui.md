# UI and product behavior

## Global shell

- The app uses a dark theme by default and follows the system dark-mode media query.
- Desktop uses a sticky top navigation: Home, Discover, Alerts, Profile, and Logout.
- Mobile uses a sticky header with title/logout and a fixed bottom tab bar for the same four destinations.
- Route changes animate horizontally with a short Framer Motion transition.
- Home and Discover support touch pull-to-refresh.

## Screens

### Authentication

- Login: email/password form, Discord OAuth button, and password-reset link.
- Register: display name, username, email, password, confirmation, and Discord OAuth button. The client validates non-empty fields, matching passwords, and a three-character minimum username.
- Forgot-password and reset-password pages exist. The current adapter stores reset tokens/password changes in localStorage rather than invoking Supabase password-recovery APIs.

### Home

- Search albums/artists and display up to 10 Spotify album cards.
- `Surprise Me!` opens a new review using a randomly selected Spotify album; the review screen can request another one.
- Tabs show the user's reviews, a feed from followed users, and Featured.
- Reviews can be filtered by folder/unfiled and deleted from the list.
- Featured is rendered in the UI, but the active client function returns no featured albums. See `roadmap.md`.

### Review

- New reviews load Spotify album tracks, allow a 0.5–10 rating per track, calculate an average, and permit a manual album-rating override.
- Users can write notes and assign a folder. Existing reviews load in edit mode for their owner and in read-only mode for others.
- Four reaction choices and comments are available. Owners can edit/delete their own comments; comment avatar/name links lead to public profiles.

### Discover and public profiles

- Discover lists searchable profiles and supports follow/unfollow.
- User profiles show avatar, display name, `@username`, bio, followers/following, social links, folders, and reviews. A saved profile section order controls Social links, Folders, and Reviews.
- The profile editor handles display name, username, bio, avatar, social links, desktop/mobile banners, section ordering, folders, a public-profile preview link, review import, theme controls, Discord UI, and a profile-delete/logout action.

### Notifications

- Notifications are synthesized from incoming follows plus reactions/comments on the current user's reviews.
- Seen and dismissed state lives in localStorage; "Clear alerts" dismisses currently displayed entries.
- The navigation badge is computed from the local seen timestamp and refreshes every 15 seconds.

## Theme customization

Profile settings expose solid/gradient mode plus primary, secondary, and box colors. The selection is local to the browser (`track-by-track-theme`) and is applied with CSS custom properties. It is not stored on the user profile.

## Accessibility and responsive behavior observed

- Forms have labels and mobile-size controls.
- Buttons/icons commonly include semantic text or labels; logout has an `aria-label` on mobile.
- TODO: perform a dedicated keyboard, screen-reader, color-contrast, and reduced-motion audit before claiming full accessibility support.
