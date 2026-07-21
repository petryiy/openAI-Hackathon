#!/bin/sh
set -eu

output_dir="${1:-public/lesson-assets/derivative-seed}"
voice_id="${ELEVENLABS_VOICE_ID:-JBFqnCBsd6RMkjVDRZzb}"
model_id="${ELEVENLABS_MODEL:-eleven_multilingual_v2}"

if [ -z "${ELEVEN_LABS:-}" ] && [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "${ELEVEN_LABS:-}" ]; then
  echo "ELEVEN_LABS is required. Add it to .env or export it before running this script." >&2
  exit 1
fi

command -v curl >/dev/null
command -v jq >/dev/null
mkdir -p "$output_dir"

render_audio() {
  name="$1"
  narration="$2"
  destination="$output_dir/$name.mp3"
  temporary="$destination.elevenlabs-part"
  payload="$(jq -cn \
    --arg text "$narration" \
    --arg model_id "$model_id" \
    '{
      text: $text,
      model_id: $model_id,
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
        speed: 0.96
      }
    }')"

  curl --fail --show-error --silent \
    --request POST \
    "https://api.elevenlabs.io/v1/text-to-speech/$voice_id?output_format=mp3_44100_128" \
    --header "xi-api-key: $ELEVEN_LABS" \
    --header "Content-Type: application/json" \
    --data "$payload" \
    --output "$temporary"
  mv "$temporary" "$destination"
  echo "Generated $destination"
}

render_audio hook "An autonomous probe is approaching a narrow gate. Average speed cannot tell it whether to brake right now. It needs to know how fast its position is changing at this instant."
render_audio secant "Choose two points on the curve. The slope of the secant through them is the average rate of change over that interval. As the second point approaches the first, the interval shrinks and the secant settles toward a tangent."
render_audio definition "The horizontal change is h. The vertical change is f of x plus h minus f of x. Their ratio is the difference quotient. We do not set h equal to zero first. We simplify, then observe what the quotient approaches as h tends to zero."
render_audio example "For f of x equals x squared at x equals one, expansion gives a function value difference of two h plus h squared. Divide by h and cancel to get two plus h. As h tends to zero, the slope tends to two."
render_audio summary "The derivative maps every position in a function to its instantaneous rate of change there. The function tells us where we are. The derivative tells us how fast that state is changing. Now complete a new derivation yourself."
