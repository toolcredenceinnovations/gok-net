import Svg, { Path } from 'react-native-svg'

type ArrowRightIconProps = {
  size?: number
  color?: string
}

export function ArrowRightIcon({ size = 16, color = '#FFFFFF' }: ArrowRightIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3.3328 8H12.6672M8 12.6672L12.6672 8L8 3.3328"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
}
