import React, { useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell } from 'lucide-react';
import api from '../services/api';

function Notification() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/notifications').then((res) => setNotifications(res.data));
  }, []);

  const handleClose = (close) => {
    notifications.forEach((n) => {
      if (!n.read) {
        api.put(`/notifications/${n._id}/read`);
      }
    });
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    close();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            onClick={() => {
              if (open) handleClose(close);
            }}
            className="relative focus:outline-none"
          >
            <div className="text-foreground">
              <Bell className="h-7 w-7" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </Popover.Button>

          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg shadow-xl z-50 bg-popover text-popover-foreground border border-border">
              <div className="p-2">
                {notifications.length === 0 ? (
                  <div className="px-4 py-2 font-medium text-foreground">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="px-4 py-2 border-b border-border last:border-b-0"
                    >
                      <p className="text-sm font-medium text-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

export default Notification;
