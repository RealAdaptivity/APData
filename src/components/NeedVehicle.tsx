import { Car } from 'lucide-react';
import { Empty, LinkButton, Page } from './ui';

/** Shown by screens that only make sense for a particular vehicle. */
export function NeedVehicle({ title, why }: { title: string; why: string }) {
  return (
    <Page title={title} back="/">
      <Empty icon={<Car className="h-8 w-8" />} title="Choose a vehicle first" action={<LinkButton to="/vehicle" variant="primary">Choose vehicle</LinkButton>}>
        {why}
      </Empty>
    </Page>
  );
}
