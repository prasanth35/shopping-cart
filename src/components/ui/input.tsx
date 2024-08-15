import { cn } from '@/lib/misc'
import * as React from 'react'



export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Pass any Icon or Text as preffix */
  prefix?: any
  suffix?: any
  containerStyle?: any
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, suffix, containerStyle, ...props }, ref) => {
    return (
      <div
        className={cn(
          `relative flex h-10 w-full rounded-md border border-input bg-card ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`,
          containerStyle || '',
        )}>
        {prefix ? (
          <div className="absolute left-0 top-0 flex h-full w-10 items-center justify-center">
            {prefix}
          </div>
        ) : null}
        <input
          className={`h-full w-full rounded-md bg-transparent ${prefix ? '' : 'pl-3'} py-2 pr-3 text-sm file:border-0 placeholder:text-muted-foreground focus:outline-0 disabled:cursor-not-allowed disabled:bg-slate-100 ${className || ''}`}
          ref={ref}
          {...props}
        />
        {suffix ? (
          <div
            onClick={props?.onClick}
            className="absolute right-0 top-0 flex h-full w-10 cursor-pointer items-center justify-center">
            {suffix}
          </div>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
