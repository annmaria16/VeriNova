import logging
import socket
import ipaddress
from urllib.parse import urlparse

logger = logging.getLogger("verinova.ssrf_protector")

class SSRFProtector:
    @staticmethod
    def validate_url(url: str) -> bool:
        try:
            parsed = urlparse(url)
            scheme = parsed.scheme.lower()
            
            # Whitelist protocols (Section 15)
            if scheme not in ("http", "https"):
                logger.warning(f"Blocked invalid protocol scheme '{scheme}' for url: {url}")
                return False
                
            hostname = parsed.hostname
            if not hostname:
                return False
                
            # Block clear localhost / cloud metadata hostname lookups
            if hostname.lower() in ("localhost", "127.0.0.1", "metadata.google.internal", "instance-data"):
                logger.warning(f"Blocked local metadata hostname '{hostname}' SSRF query attempt.")
                return False
                
            # Resolve IP to verify private subnet ranges (Section 14)
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)
            
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                logger.warning(f"Blocked private subnet IP access '{ip_str}' for domain '{hostname}'.")
                return False
                
            return True
        except Exception as e:
            logger.error(f"Error validating URL safety: {str(e)}")
            return False
