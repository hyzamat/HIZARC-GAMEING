import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cn } from '@/lib/cn'

type ContainerProps<T extends ElementType> = { as?: T } & ComponentPropsWithoutRef<T>

/** Page-width wrapper: 20px gutters on phones, growing to 48px; max 1400px. */
export function Container<T extends ElementType = 'div'>({ as, className, ...rest }: ContainerProps<T>) {
  const Tag = (as ?? 'div') as ElementType
  return <Tag className={cn('mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12', className)} {...rest} />
}
