variable "digitalocean_token" {
  description = "DigitalOcean API token. Supply through TF_VAR_digitalocean_token or another secure Terraform mechanism; never commit it."
  type        = string
  sensitive   = true
}

variable "ssh_key_fingerprint" {
  description = "Existing DigitalOcean SSH key fingerprint or ID for administrator access."
  type        = string
}

variable "admin_cidrs" {
  description = "Trusted administrator CIDRs permitted to SSH to the host."
  type        = list(string)
  validation {
    condition     = length(var.admin_cidrs) > 0
    error_message = "At least one trusted administrator CIDR is required."
  }
}

variable "region" {
  description = "DigitalOcean region. nyc3 is the approved default for the first pilot."
  type        = string
  default     = "nyc3"
}

variable "droplet_size" {
  description = "Approved Phase 3 pilot size. Do not increase without separate Founder approval."
  type        = string
  default     = "s-1vcpu-1gb"
  validation {
    condition     = var.droplet_size == "s-1vcpu-1gb"
    error_message = "Phase 3 pilot is locked to s-1vcpu-1gb. A larger size requires new Founder approval."
  }
}

variable "image" {
  description = "Approved Ubuntu LTS image slug."
  type        = string
  default     = "ubuntu-24-04-x64"
}
