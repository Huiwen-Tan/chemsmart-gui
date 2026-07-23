import { useEffect, useState } from 'react';

interface WorkbenchMenuBaseItem {
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
}

export interface WorkbenchMenuActionItem extends WorkbenchMenuBaseItem {
  active?: boolean;
  kind: 'action';
  onSelect?: () => void;
}

export interface WorkbenchMenuCheckboxItem extends WorkbenchMenuBaseItem {
  checked: boolean;
  kind: 'checkbox';
  onSelect?: () => void;
}

export interface WorkbenchMenuSeparatorItem {
  id: string;
  kind: 'separator';
}

export type WorkbenchMenuItem =
  | WorkbenchMenuActionItem
  | WorkbenchMenuCheckboxItem
  | WorkbenchMenuSeparatorItem;

export interface WorkbenchMenuGroup {
  id: string;
  items: readonly WorkbenchMenuItem[];
  label: string;
}

interface WorkbenchMenuBarProps {
  groups: readonly WorkbenchMenuGroup[];
}

export function WorkbenchMenuBar({
  groups,
}: WorkbenchMenuBarProps): JSX.Element {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!openGroupId) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenGroupId(null);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [openGroupId]);

  const selectMenuItem = (item: WorkbenchMenuItem): void => {
    if (item.kind === 'separator' || item.disabled) {
      return;
    }

    item.onSelect?.();
    setOpenGroupId(null);
  };

  return (
    <nav aria-label="Application menu" className="workbench-menu-bar">
      {groups.map((group) => {
        const isOpen = openGroupId === group.id;
        const menuId = `workbench-menu-${group.id}`;
        const visibleItems =
          group.items.length > 0
            ? group.items
            : [
                {
                  description: 'This command group has no actions yet.',
                  disabled: true,
                  id: `${group.id}-empty`,
                  kind: 'action',
                  label: 'No commands available',
                } satisfies WorkbenchMenuActionItem,
              ];

        return (
          <div className="workbench-menu-group" key={group.id}>
            <button
              aria-controls={menuId}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              className="workbench-menu-trigger"
              onClick={() => setOpenGroupId(isOpen ? null : group.id)}
              type="button"
            >
              {group.label}
            </button>
            {isOpen ? (
              <div
                aria-label={`${group.label} menu`}
                className="workbench-menu-panel"
                id={menuId}
                role="menu"
              >
                {visibleItems.map((item) => (
                  <WorkbenchMenuItemButton
                    item={item}
                    key={item.id}
                    onSelect={selectMenuItem}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

interface WorkbenchMenuItemButtonProps {
  item: WorkbenchMenuItem;
  onSelect: (item: WorkbenchMenuItem) => void;
}

function WorkbenchMenuItemButton({
  item,
  onSelect,
}: WorkbenchMenuItemButtonProps): JSX.Element {
  if (item.kind === 'separator') {
    return <div className="workbench-menu-separator" role="separator" />;
  }

  const isCheckbox = item.kind === 'checkbox';
  const role = isCheckbox ? 'menuitemcheckbox' : 'menuitem';
  const active = item.kind === 'action' ? item.active : item.checked;

  return (
    <button
      aria-checked={isCheckbox ? item.checked : undefined}
      aria-current={active && !isCheckbox ? 'true' : undefined}
      className="workbench-menu-item"
      data-active={active ? 'true' : 'false'}
      disabled={item.disabled}
      onClick={() => onSelect(item)}
      role={role}
      type="button"
    >
      <span className="workbench-menu-item-label">{item.label}</span>
      {item.description ? (
        <span aria-hidden="true" className="workbench-menu-item-description">
          {item.description}
        </span>
      ) : null}
    </button>
  );
}
