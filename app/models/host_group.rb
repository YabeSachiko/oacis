class HostGroup
  include Mongoid::Document
  include Mongoid::Timestamps

  field :name, type: String

  has_and_belongs_to_many :hosts

  validates :name, presence: true, uniqueness: true, length: {minimum: 1}
  validates :host_ids, length: {minimum: 1}

  before_destroy :validate_destroyable

  def destroyable?
    Run.where(status: :created, host_group: self).empty?
  end

  def validate_destroyable
    if destroyable?
      return true
    else
      errors.add(:base, "Created/Submitted Runs exist")
      return false
    end
  end
end