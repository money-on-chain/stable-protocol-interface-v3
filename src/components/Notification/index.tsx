import React /*, { useEffect }*/ from "react";

import { useProjectTranslation } from "../../helpers/translations";
import "./Styles.scss";

interface NotifStatus {
    notifClass: string;
    iconLeft: string;
    title: string;
    textContent: string;
    isDismisable?: boolean;
}

interface NotificationBodyProps {
    notifStatus: NotifStatus;
}

export default function NotificationBody(props: NotificationBodyProps): React.ReactElement {
    const { t } = useProjectTranslation();
    //const [visible, setVisible] = useState(false);
    const { notifStatus } = props;

    /*
    useEffect(() => {
        console.log('props', props.notifStatus);
    }, [props]);*/

    /*
    const showModal = () => {
        setVisible(true);
    };*/

    const hideModal = (): void => {
        //setVisible(false);
    };

    return (
        <div className={`notification-container-${notifStatus.notifClass}`}>
            <div className="icon-left">
                <i className={`${notifStatus.iconLeft}-notif`}></i>
            </div>
            <div className="text-content">
                <h4>{notifStatus.title}</h4>
                <p>{notifStatus.textContent}</p>
            </div>
            <div>
                {notifStatus.isDismisable && (
                    <div className="action">
                        <button onClick={hideModal}>
                            {t("notification.dismiss")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
} 