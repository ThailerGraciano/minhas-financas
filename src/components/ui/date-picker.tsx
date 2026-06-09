"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  id?: string;
  name?: string;
  defaultValue?: string; // Format: YYYY-MM-DD
  required?: boolean;
}

export function DatePicker({ id, name, defaultValue, required }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    defaultValue ? parse(defaultValue, "yyyy-MM-dd", new Date()) : undefined
  )

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-background h-10 px-3 py-2 text-sm",
              !date && "text-muted-foreground"
            )}
            id={id}
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      {name && (
        <input 
          type="hidden" 
          name={name} 
          value={date ? format(date, "yyyy-MM-dd") : ""} 
          required={required}
        />
      )}
    </>
  )
}
