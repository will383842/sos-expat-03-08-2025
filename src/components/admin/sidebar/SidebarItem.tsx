import React from "react";
import { NavLink } from "react-router-dom";

export interface MenuNode {
  id: string;
  label: string;
  path?: string;
  children?: MenuNode[];
  icon?: React.ReactNode;
}

interface Props {
  node: MenuNode;
}

const SidebarItem: React.FC<Props> = ({ node }) => {
  if (node.children && node.children.length > 0) {
    return (
      <div className="mb-2">
        <div className="px-3 py-2 text-xs font-semibold uppercase opacity-70">
          {node.label}
        </div>
        <div className="ml-2">
          {node.children.map((child) => (
            <SidebarItem key={child.id} node={child} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={node.path || "#"}
      className={({ isActive }) =>
        `flex items-center px-3 py-2 rounded-md text-sm ${
          isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
        }`
      }
    >
      {node.icon && <span className="mr-2">{node.icon}</span>}
      {node.label}
    </NavLink>
  );
};

export default SidebarItem;
