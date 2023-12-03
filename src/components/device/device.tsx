import { type ReactNode } from 'react'
import {isMacOs}  from 'react-device-detect'
import { Slot } from "@radix-ui/react-slot";

interface DeviceProps {
  children: (props: { isMacOs: typeof isMacOs }) => ReactNode
}

export default function Device({ children }: DeviceProps) {
  return <Slot>{children({ isMacOs })}</Slot>
}


