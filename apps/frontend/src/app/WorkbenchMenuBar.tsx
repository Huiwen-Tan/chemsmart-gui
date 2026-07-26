import { useEffect, useRef, useState } from 'react';

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
  const menuBarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openGroupId) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenGroupId(null);
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !menuBarRef.current?.contains(event.target)
      ) {
        setOpenGroupId(null);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
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
    <nav
      aria-label="Application menu"
      className="workbench-menu-bar"
      ref={menuBarRef}
    >
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
  const descriptionId = item.description
    ? `workbench-menu-item-${item.id}-description`
    : undefined;
  const labelId = `workbench-menu-item-${item.id}-label`;

  return (
    <button
      aria-checked={isCheckbox ? item.checked : undefined}
      aria-current={active && !isCheckbox ? 'true' : undefined}
      aria-describedby={descriptionId}
      aria-labelledby={labelId}
      className="workbench-menu-item"
      data-active={active ? 'true' : 'false'}
      disabled={item.disabled}
      onClick={() => onSelect(item)}
      role={role}
      type="button"
    >
      <span className="workbench-menu-item-label" id={labelId}>
        {item.label}
      </span>
      {item.description ? (
        <span
          className="workbench-menu-item-description"
          id={descriptionId}
        >
          {item.description}
        </span>
      ) : null}
    </button>
  );
}
