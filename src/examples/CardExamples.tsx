import { PermutationTable } from './PermutationTable.tsx'
import { UnrankStepper } from './UnrankStepper.tsx'
import {
  createWalkthrough,
  type Example,
  type Walkthrough,
} from './walkthrough.ts'

export function UnrankExample(props: Example) {
  const model = createWalkthrough(props)
  return <UnrankStepper model={model} />
}

export function FourCardWalkthrough(props: { readonly model: Walkthrough }) {
  return (
    <>
      <PermutationTable size={4} onSelect={props.model.select} />
      <UnrankStepper model={props.model} />
    </>
  )
}
