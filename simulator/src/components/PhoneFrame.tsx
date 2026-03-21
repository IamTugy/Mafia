interface PhoneFrameProps {
  label: string;
  src: string;
  scaleFactor: number;
  refreshKey: number;
}

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const BEZEL = 12; // px around iframe inside bezel

export function PhoneFrame({ label, src, scaleFactor, refreshKey }: PhoneFrameProps) {
  const outerWidth = (PHONE_WIDTH + BEZEL * 2) * scaleFactor;
  const outerHeight = (PHONE_HEIGHT + BEZEL * 2 + 40) * scaleFactor; // 40 for top bar with label

  return (
    <div
      style={{ width: outerWidth, height: outerHeight, margin: '0 auto' }}
      className="select-none"
    >
      {/* Phone shell — renders at 1x, then scaled down */}
      <div
        style={{
          width: PHONE_WIDTH + BEZEL * 2,
          height: PHONE_HEIGHT + BEZEL * 2 + 40,
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
        }}
        className="relative overflow-hidden rounded-[44px] bg-gray-800 shadow-2xl ring-1 ring-white/10"
      >
        {/* Notch bar — top of phone */}
        <div className="relative flex h-10 items-center justify-center bg-gray-900">
          {/* Notch pill */}
          <div className="absolute top-2 h-5 w-24 rounded-full bg-black" />
          {/* Label */}
          <span className="relative z-10 text-xs font-medium text-gray-400">{label}</span>
        </div>

        {/* Side buttons (decorative) */}
        <div
          className="absolute left-0 top-24 h-8 w-1 rounded-r bg-gray-600"
          style={{ marginLeft: -1 }}
        />
        <div
          className="absolute left-0 top-36 h-12 w-1 rounded-r bg-gray-600"
          style={{ marginLeft: -1 }}
        />
        <div
          className="absolute right-0 top-32 h-14 w-1 rounded-l bg-gray-600"
          style={{ marginRight: -1 }}
        />

        {/* Screen area */}
        <div className="overflow-hidden" style={{ width: PHONE_WIDTH, margin: `0 ${BEZEL}px` }}>
          <iframe
            key={refreshKey}
            src={src}
            width={PHONE_WIDTH}
            height={PHONE_HEIGHT}
            style={{ border: 'none', display: 'block' }}
            title={label}
          />
        </div>

        {/* Home bar */}
        <div className="flex h-6 items-center justify-center bg-gray-900">
          <div className="h-1 w-24 rounded-full bg-gray-600" />
        </div>
      </div>
    </div>
  );
}
