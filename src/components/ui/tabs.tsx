// src/components/ui/tabs.tsx
import * as React from 'react';

type TabProps = {
  value: string;
  label: string;
  children?: React.ReactNode;
};

type TabsProps = {
  defaultValue: string;
  className?: string;
  children: React.ReactElement<TabProps> | React.ReactElement<TabProps>[];
};

export const Tab: React.FC<TabProps> = () => null;

export const Tabs: React.FC<TabsProps> = ({ defaultValue, className, children }) => {
  const [active, setActive] = React.useState(defaultValue);
  const tabs = React.Children.toArray(children) as React.ReactElement<TabProps>[];

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.props.value}
            onClick={() => setActive(t.props.value)}
            className={`px-3 py-2 rounded-t-md text-sm ${active === t.props.value ? 'border border-b-0 font-medium' : 'opacity-70'}`}
            aria-selected={active === t.props.value}
            role="tab"
          >
            {t.props.label}
          </button>
        ))}
      </div>
      <div className="pt-4" role="tabpanel">
        {tabs.find((t) => t.props.value === active)?.props.children}
      </div>
    </div>
  );
};

export default Tabs;
