terraform {
  required_version = ">= 1.6.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.digitalocean_token
}

resource "digitalocean_droplet" "webops_phase3" {
  name       = "elevate360-webops-phase3"
  region     = var.region
  size       = var.droplet_size
  image      = var.image
  ssh_keys   = [var.ssh_key_fingerprint]
  monitoring = true
  backups    = false
  ipv6       = false
  tags       = ["elevate360", "webops-phase3", "isolated-worker"]
  user_data  = file("${path.module}/cloud-init.yaml")

  lifecycle {
    prevent_destroy = true
  }
}

resource "digitalocean_firewall" "webops_phase3" {
  name        = "elevate360-webops-phase3"
  droplet_ids = [digitalocean_droplet.webops_phase3.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.admin_cidrs
  }

  # DNS for package/bootstrap and gateway resolution.
  outbound_rule {
    protocol              = "udp"
    port_range            = "53"
    destination_addresses = ["0.0.0.0/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "53"
    destination_addresses = ["0.0.0.0/0"]
  }

  # HTTPS only for bootstrap/package retrieval and later gateway inspection traffic.
  outbound_rule {
    protocol              = "tcp"
    port_range            = "443"
    destination_addresses = ["0.0.0.0/0"]
  }

  # Time synchronization.
  outbound_rule {
    protocol              = "udp"
    port_range            = "123"
    destination_addresses = ["0.0.0.0/0"]
  }
}

output "droplet_id" {
  value = digitalocean_droplet.webops_phase3.id
}

output "droplet_ipv4" {
  value = digitalocean_droplet.webops_phase3.ipv4_address
}
