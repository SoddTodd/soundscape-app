<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the LIDU Focus System soundscape app. Because this is a pure client-side browser application with no Node.js server or build system, the integration uses **posthog-js** loaded via CDN snippet (similar to how Tone.js is already loaded) rather than posthog-node. The snippet is placed in `<head>` of `index.html` and initialises automatically before any user interaction.

13 events were instrumented across `main.js`, covering every meaningful user action: mode and mood selection, texture and solfeggio choices, binaural activation, the Pomodoro flow timer, preset management, quick-play shortcuts, and feedback panel opens. Each event carries contextual properties (active mode, mood, intensity, etc.) to make filtering and segmentation immediately useful.

Environment variable names `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` have been written to `.env` (already covered by `.gitignore`). The HTML snippet falls back to `window.POSTHOG_PROJECT_TOKEN` so the token can be overridden at runtime without a rebuild.

| Event | Description | File |
|---|---|---|
| `mode_selected` | User activates a focus mode (deepFocus, flowState, energyBoost, binauralFocus, binauralRelax, deepSleep) | main.js |
| `mood_selected` | User selects a mood profile (stressed, tired, focused, calm) | main.js |
| `texture_selected` | User manually picks an ambient texture (rain, ocean, wind, cafe, none) | main.js |
| `solfeggio_selected` | User picks a solfeggio frequency overlay (396–852 Hz) | main.js |
| `binaural_activated` | User activates binaural mode with a specific type (focus or relax) | main.js |
| `flow_timer_started` | User starts the Pomodoro flow timer | main.js |
| `all_sounds_stopped` | User stops all audio via the Stop button | main.js |
| `preset_saved` | User saves a custom preset with their current configuration | main.js |
| `preset_loaded` | User loads a saved preset | main.js |
| `preset_deleted` | User deletes a saved preset | main.js |
| `feedback_form_opened` | User opens feedback panel or clicks the Tally feedback CTA | main.js |
| `rain_shortcut_activated` | User activates the rain quick-play shortcut | main.js |
| `sleep_mode_activated` | User activates the deep sleep quick-play shortcut | main.js |

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior based on the events instrumented above:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/159859/dashboard/625035
- **Focus Mode Popularity** (bar chart, breakdown by mode): https://eu.posthog.com/project/159859/insights/03cMNIDQ
- **Mood Selection Distribution** (bar chart, breakdown by mood): https://eu.posthog.com/project/159859/insights/33ulEhd4
- **Ambient Texture Preferences** (bar chart, breakdown by texture): https://eu.posthog.com/project/159859/insights/Ra3FkWUp
- **Session Engagement Funnel** (mode selected → timer started → session ended): https://eu.posthog.com/project/159859/insights/o7SSXs1c
- **Preset Usage Over Time** (preset_saved vs preset_loaded line chart): https://eu.posthog.com/project/159859/insights/hEkkS1XM

</wizard-report>
