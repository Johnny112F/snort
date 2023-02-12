import "./ProfileImage.css";

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserProfile } from "Feed/ProfileFeed";
import { hexToBech32, profileLink } from "Util";
import Avatar from "Element/Avatar";
import Nip05 from "Element/Nip05";
import { HexKey } from "@snort/nostr";
import { MetadataCache } from "State/Users";
import useClientWidth from "Hooks/useClientWidth";

export interface ProfileImageProps {
  pubkey: HexKey;
  subHeader?: JSX.Element;
  showUsername?: boolean;
  className?: string;
  link?: string;
  defaultNip?: string;
  verifyNip?: boolean;
}

export default function ProfileImage({
  pubkey,
  subHeader,
  showUsername = true,
  className,
  link,
  defaultNip,
  verifyNip,
}: ProfileImageProps) {
  const navigate = useNavigate();
  const user = useUserProfile(pubkey);
  const nip05 = defaultNip ? defaultNip : user?.nip05;
  const width = useClientWidth();

  const name = useMemo(() => {
    return getDisplayName(user, pubkey);
  }, [user, pubkey]);

  if (!pubkey && !link) {
    link = "#";
  }

  return (
    <div className={`pfp${className ? ` ${className}` : ""}`}>
      <div className="avatar-wrapper">
        <Avatar user={user} onClick={() => navigate(link ?? profileLink(pubkey))} />
      </div>
      {showUsername && (
        <div className="profile-name">
          <div className="username">
            <Link className="display-name" key={pubkey} to={link ?? profileLink(pubkey)}>
              <div>{name}</div>
              {nip05 && <Nip05 nip05={nip05} pubkey={pubkey} verifyNip={verifyNip} />}
            </Link>
          </div>
          <div className="subheader" style={{ width: width - 190 }}>
            {subHeader}
          </div>
        </div>
      )}
    </div>
  );
}

export function getDisplayName(user: MetadataCache | undefined, pubkey: HexKey) {
  let name = hexToBech32("npub", pubkey).substring(0, 12);
  if (user?.display_name !== undefined && user.display_name.length > 0) {
    name = user.display_name;
  } else if (user?.name !== undefined && user.name.length > 0) {
    name = user.name;
  }
  return name;
}
