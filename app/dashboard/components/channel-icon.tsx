export function ChannelIcon({
  channel,
  size = 12,
  className = '',
}: {
  channel: string;
  size?: number;
  className?: string;
}) {
  if (channel === 'airbnb') {
    // Airbnb Bélo — teardrop/location-pin with circle cut-out
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        className={className}
        aria-hidden
      >
        <path d="M8 1C5.2 1 3 3.3 3 6.1c0 3.5 4.4 8.5 4.8 9 .1.1.3.1.4 0C8.6 14.6 13 9.6 13 6.1 13 3.3 10.8 1 8 1zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
      </svg>
    );
  }

  if (channel === 'booking') {
    // Booking.com — bold B letterform
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        className={className}
        aria-hidden
      >
        <path d="M3 2h5.4c1.8 0 2.9 1 2.9 2.5 0 .9-.4 1.6-1 2 1 .4 1.6 1.2 1.6 2.2C11.9 10.5 10.6 12 8.5 12H3V2zm2.5 2.5v2.3H8c.7 0 1.1-.4 1.1-.9v-.5c0-.5-.3-.9-1-.9H5.5zm0 4.5V11H8.5c.8 0 1.3-.5 1.3-1.1 0-.6-.4-1.1-1.2-1.1H5.5z" />
      </svg>
    );
  }

  // Direct — simple house
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8 2L2 7.2h1.8V14h3.5v-3.8h1.4V14h3.5V7.2H14L8 2z" />
    </svg>
  );
}
